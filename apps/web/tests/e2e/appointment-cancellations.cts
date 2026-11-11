import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import bcrypt from "bcrypt";
import { Builder, By, until } from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome";
import { prisma } from "@/lib/prisma";

async function main() {
  assert.ok(["localhost", "127.0.0.1"].includes(new URL(process.env.DATABASE_URL!).hostname), "Solo base local");
  const users: string[] = [];
  let browser: Awaited<ReturnType<Builder["build"]>> | undefined;
  const reason = "El paciente requiere viajar y solicita cancelar su atención.";
  const appointmentId = randomUUID();
  const requestId = randomUUID();
  const patientId = randomUUID();
  const dentistId = randomUUID();
  try {
    for (const role of ["RECEPTIONIST", "ADMIN"] as const) {
      const password = randomUUID();
      const user = await prisma.user.create({ data: { email: `cancellation-ui-${randomUUID()}@example.test`, firstName: "Prueba", lastName: role, role, passwordHash: await bcrypt.hash(password, 10) } });
      users.push(user.id);
      browser = await new Builder().forBrowser("chrome").setChromeOptions(new chrome.Options().addArguments("--headless=new", "--disable-gpu", "--window-size=1440,1000")).build();
      const date = new Date().toISOString().slice(0, 10);
      const entry = { id: requestId, appointmentId, originalStatus: "CONFIRMED", currentStatus: "CONFIRMED", state: "REQUESTED", patient: { id: patientId, name: "Paciente Visual" }, dentist: { id: dentistId, name: "Doctor Visual" }, date, startTime: "09:00", endTime: "10:00", requestedBy: { id: users[0], name: "Recepción Visual", role: "RECEPTIONIST" }, requestReason: reason, reviewReason: null, reviewedBy: null, createdAt: new Date().toISOString(), reviewedAt: null };
      const appointments = ["CONFIRMED", "PENDING"].map((status, i) => ({ id: i ? randomUUID() : appointmentId, status, patientId, dentistId, date, startTime: i ? "10:00" : "09:00", endTime: i ? "11:00" : "10:00", patient: { id: patientId, firstName: "Paciente", lastName: "Visual", dni: "01234567" }, dentist: { id: dentistId, user: { firstName: "Doctor", lastName: "Visual" } } }));
      await browser.sendDevToolsCommand("Page.addScriptToEvaluateOnNewDocument", { source: `
        window.__writes = [];
        const appointments = ${JSON.stringify(appointments)};
        const entry = ${JSON.stringify(entry)};
        const original = window.fetch.bind(window);
        const json = (data) => Promise.resolve(new Response(JSON.stringify(data), {status:200,headers:{'Content-Type':'application/json'}}));
        window.fetch = (request, options) => {
          const url = new URL(typeof request === 'string' ? request : request.url, location.origin);
          const method = options?.method || 'GET';
          if (url.pathname === '/api/appointments' && method === 'GET') return json(appointments);
          if (url.pathname === '/api/dentists') return json([]);
          if (url.pathname === '/api/reports/reassignments') return json({items:[],total:0,page:1,pageSize:25});
          if (url.pathname === '/api/reports/cancellations') {
            const state = url.searchParams.get('state');
            return json({items: !state || state === entry.state ? [entry] : [],total: !state || state === entry.state ? 1 : 0,page:1,pageSize:10,summary:{requested:entry.state === 'REQUESTED' ? 1 : 0,approved:entry.state === 'APPROVED' ? 1 : 0,rejected:0,reassignments:4},activity:[{month:${JSON.stringify(date.slice(0, 7))},requests:1,cancellations:entry.state === 'APPROVED' ? 1 : 0,reassignments:4}]});
          }
          if ((url.pathname.endsWith('/cancellation-requests') || url.pathname.endsWith('/cancel') || url.pathname.endsWith('/review')) && method !== 'GET') {
            window.__writes.push({url:url.pathname,body:JSON.parse(options.body)});
            if (url.pathname.endsWith('/review')) {entry.state = 'APPROVED';entry.reviewReason=JSON.parse(options.body).reason;}
            return json({id:entry.id,state:entry.state});
          }
          return original(request, options);
        };
      ` });
      const route = role === "ADMIN" ? "/reports/reassignments" : "/appointments";
      await browser.get(`http://localhost:3000/login?callbackUrl=${route}`);
      await browser.wait(until.elementLocated(By.id("email")), 30000);
      await browser.findElement(By.id("email")).sendKeys(user.email);
      await browser.findElement(By.id("password")).sendKeys(password);
      await browser.findElement(By.css("button[type=submit]")).click();
      if (role === "RECEPTIONIST") {
        await browser.wait(until.elementLocated(By.id("appointment-search")), 40000);
        for (const [index, label] of ["Solicitar cancelación", "Cancelar cita"].entries()) {
          const actions = await browser.findElements(By.css('button[aria-label^="Acciones de la cita"]'));
          await actions[index]!.click();
          const action = await browser.wait(until.elementLocated(By.xpath(`//*[@role='menuitem'][contains(., '${label}')]`)), 5000);
          await action.click();
          await browser.wait(until.elementLocated(By.id("cancellation-reason")), 5000);
          assert.equal(await browser.findElement(By.css('[role="dialog"] button[type="submit"]')).isEnabled(), false);
          await browser.findElement(By.id("cancellation-reason")).sendKeys(reason);
          await browser.findElement(By.css('[role="dialog"] input[type="checkbox"]')).click();
          await browser.findElement(By.css('[role="dialog"] button[type="submit"]')).click();
          await browser.wait(async () => (await browser.findElements(By.id("cancellation-reason"))).length === 0, 5000);
        }
        const writes = await browser.executeScript<Array<{ url: string; body: { reason: string } }>>("return window.__writes");
        assert.equal(writes.length, 2);
        assert.ok(writes[0]!.url.endsWith("/cancellation-requests"));
        assert.ok(writes[1]!.url.endsWith("/cancel"));
        assert.equal(writes[0]!.body.reason, reason);
        console.log("OK: Recepción solicita la confirmada y cancela la pendiente con motivo y confirmación.");
      } else {
        await browser.wait(until.elementLocated(By.id("cancellation-state")), 40000);
        assert.equal((await browser.findElements(By.css('svg[role="img"]'))).length, 2);
        assert.match(await browser.findElement(By.css('section[aria-label="Gestión de cancelaciones"]')).getText(), /Recepción Visual/);
        const screenshot = path.join(tmpdir(), "biodentis-reporte-cancelaciones-1440.png");
        await writeFile(screenshot, await browser.takeScreenshot(), "base64");
        console.log(`Captura: ${screenshot}`);
        await browser.findElement(By.xpath("//button[contains(., 'Revisar solicitud')] ")).click();
        await browser.wait(until.elementLocated(By.id("review-reason")), 5000);
        assert.equal(await browser.findElement(By.css('[role="dialog"] button[type="submit"]')).isEnabled(), false);
        await browser.findElement(By.id("review-reason")).sendKeys("Se revisó la solicitud y se autoriza la cancelación.");
        await browser.findElement(By.css('[role="dialog"] input[type="checkbox"]')).click();
        await browser.findElement(By.css('[role="dialog"] button[type="submit"]')).click();
        await browser.wait(async () => (await browser.findElements(By.id("review-reason"))).length === 0, 5000);
        const writes = await browser.executeScript<Array<{ body: { decision: string; reason: string } }>>("return window.__writes");
        assert.equal(writes[0]!.body.decision, "APPROVE");
        assert.ok(writes[0]!.body.reason.length >= 25);
        for (const width of [375, 320]) {
          await browser.manage().window().setRect({ width, height: 1000 });
          assert.equal(await browser.executeScript<boolean>("return document.documentElement.scrollWidth <= window.innerWidth"), true);
        }
        console.log("OK: Administración ve notificación, gráficos y ambos motivos; aprueba con motivo adicional. Sin desborde a 375/320 px.");
      }
      await browser.quit();
      browser = undefined;
    }
  } finally {
    await browser?.quit();
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await prisma.$disconnect();
  }
}
main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "Error de validación visual"); process.exitCode = 1; });
