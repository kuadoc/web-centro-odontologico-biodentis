import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import bcrypt from "bcrypt";
import { Builder, By, Key, until } from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome";
import { prisma } from "@/lib/prisma";

async function main() {
  // Cuenta temporal propia; las citas mostradas son fixtures del navegador.
  // No se crean ni modifican pacientes o citas de la base de datos.
  const password = randomUUID();
  const user = await prisma.user.create({ data: {
    email: `filters-${randomUUID()}@example.test`, passwordHash: await bcrypt.hash(password, 10),
    role: "ADMIN", firstName: "Prueba", lastName: "Filtros",
  } });
  let driver: Awaited<ReturnType<Builder["build"]>> | undefined;
  try {
    driver = await new Builder().forBrowser("chrome")
      .setChromeOptions(new chrome.Options().addArguments("--headless=new", "--disable-gpu", "--window-size=1440,1000"))
      .build();
    const browser = driver;
    const month = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()).slice(0, 7);
    const appointments = Array.from({ length: 12 }, (_, index) => ({
      id: `fixture-${index}`, patientId: `patient-${index}`, dentistId: "dentist", notes: null,
      date: `${month}-${String(index === 0 ? 7 : index === 1 ? 9 : 10 + index).padStart(2, "0")}T00:00:00.000Z`,
      startTime: "09:00", endTime: "09:30", status: index === 1 ? "PENDING" : "CONFIRMED",
      patient: { id: `patient-${index}`, firstName: index === 0 ? "María José" : `Paciente ${index}`, lastName: "Pérez", dni: index === 0 ? "01234567" : null },
      dentist: { id: "dentist", user: { firstName: "Óscar", lastName: "Núñez" } },
    }));
    await browser.sendDevToolsCommand("Page.addScriptToEvaluateOnNewDocument", { source: `
      const originalFetch = window.fetch.bind(window);
      window.fetch = (request, options) => {
        const url = new URL(typeof request === 'string' ? request : request.url, location.origin);
        if ((!options?.method || options.method === 'GET') && url.pathname === '/api/appointments') {
          return Promise.resolve(new Response(JSON.stringify(${JSON.stringify(appointments)}), {status:200, headers:{'Content-Type':'application/json'}}));
        }
        if ((!options?.method || options.method === 'GET') && url.pathname === '/api/dentists') {
          return Promise.resolve(new Response('[]', {status:200, headers:{'Content-Type':'application/json'}}));
        }
        return originalFetch(request, options);
      };
    ` });
    await browser.get("http://localhost:3000/login?callbackUrl=/appointments");
    await browser.wait(until.elementLocated(By.id("email")), 30_000);
    await browser.findElement(By.id("email")).sendKeys(user.email);
    await browser.findElement(By.id("password")).sendKeys(password);
    await browser.findElement(By.css("button[type=submit]")).click();
    await browser.wait(until.elementLocated(By.id("appointment-search")), 40_000);
    const rows = () => browser.findElements(By.css('[aria-label="Listado de citas"] [data-slot="table-row"]'));
    await browser.wait(async () => (await rows()).length === 10, 20_000);
    console.log("OK: listado con fixtures y sesión real de prueba");

    const search = await browser.findElement(By.id("appointment-search"));
    for (const term of ["maria perez", "01234567", "oscar nunez"]) {
      await search.sendKeys(Key.chord(Key.CONTROL, "a"), term);
      await browser.wait(async () => (await rows()).length === (term === "oscar nunez" ? 10 : 1), 5000);
    }
    await search.sendKeys(Key.chord(Key.CONTROL, "a"), Key.BACK_SPACE);
    const nextButtons = await browser.findElements(By.css('button[aria-label="Página siguiente"]'));
    for (const button of nextButtons) if (await button.isDisplayed()) { await button.click(); break; }
    await browser.wait(async () => (await rows()).length === 2, 5000);
    await search.sendKeys("01234567");
    await browser.wait(async () => (await rows()).length === 1, 5000);
    assert.match(await browser.findElement(By.css('[aria-label="Listado de citas"]')).getText(), /María José/);
    console.log("OK: búsqueda por paciente, odontólogo y DNI; reinicio de paginación");

    const clear = () => browser.findElement(By.xpath("//button[contains(., 'Limpiar filtros')]"));
    await (await clear()).click();
    await browser.findElement(By.css('button[aria-label="Abrir calendario de rango de fechas"]')).click();
    await browser.wait(until.elementLocated(By.css('[role="dialog"] [role="grid"]')), 5000);
    async function selectDay(day: string) {
      const cells = await browser.findElements(By.css('[role="dialog"] [role="grid"] [role="button"]'));
      for (const cell of cells) {
        if (await cell.isDisplayed() && (await cell.getText()).trim() === day) { await cell.click(); return; }
      }
      throw new Error(`No se encontró el día ${day} del calendario`);
    }
    await selectDay("7");
    await selectDay("9");
    await browser.wait(async () => (await rows()).length === 2, 5000);
    const status = await browser.findElement(By.id("appointment-status"));
    await status.sendKeys("Confirmada", Key.ENTER);
    await browser.wait(async () => (await rows()).length === 1, 5000);
    await search.sendKeys("01234567");
    await browser.wait(async () => (await rows()).length === 1, 5000);
    console.log("OK: calendario Desde/Hasta inclusivo, combinado con estado y DNI");
    await browser.findElement(By.css('button[aria-label="Abrir calendario de rango de fechas"]')).click();
    await browser.wait(until.elementLocated(By.css('[role="dialog"] [role="grid"]')), 5000);
    const desktop = path.join(tmpdir(), "biodentis-citas-filtros-1440.png");
    await browser.wait(async () => (await browser.findElements(By.css('[data-entering]'))).length === 0, 5000);
    await writeFile(desktop, await browser.takeScreenshot(), "base64");
    console.log(`Captura: ${desktop}`);
    await browser.actions().sendKeys(Key.ESCAPE).perform();
    await (await clear()).click();
    await browser.wait(async () => (await rows()).length === 10, 5000);
    assert.equal(await search.getAttribute("value"), "");
    console.log("OK: limpiar restaura las 12 citas y la primera página");

    for (const width of [375, 320]) {
      await browser.manage().window().setRect({ width, height: 900 });
      await browser.sendDevToolsCommand("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: true });
      assert.equal(await browser.executeScript("return document.documentElement.scrollWidth <= window.innerWidth"), true, `Desborde a ${width}px`);
      console.log(`OK: ancho móvil ${width}px`);
      await browser.findElement(By.css('button[aria-label="Abrir calendario de rango de fechas"]')).click();
      await browser.wait(until.elementLocated(By.css('[role="dialog"] [role="grid"]')), 5000);
      assert.equal(await browser.executeScript("return document.documentElement.scrollWidth <= window.innerWidth"), true, `Desborde del calendario a ${width}px`);
      const screenshot = path.join(tmpdir(), `biodentis-citas-filtros-${width}.png`);
      await browser.wait(async () => (await browser.findElements(By.css('[data-entering]'))).length === 0, 5000);
      await writeFile(screenshot, await browser.takeScreenshot(), "base64");
      console.log(`Captura: ${screenshot}`);
      await browser.actions().sendKeys(Key.ESCAPE).perform();
    }
    console.log("OK: limpiar filtros y presentación móvil a 375/320px sin desborde");
  } catch (error) {
    if (driver) {
      const screenshot = path.join(tmpdir(), "biodentis-citas-filtros-error.png");
      await writeFile(screenshot, await driver.takeScreenshot(), "base64");
      console.log(`Captura de diagnóstico: ${screenshot}`);
    }
    throw error;
  } finally {
    try { await driver?.quit(); }
    finally {
      // Elimina únicamente la cuenta temporal creada por esta ejecución y sus sesiones.
      await prisma.user.delete({ where: { id: user.id } });
      await prisma.$disconnect();
    }
  }
}

main().catch((error: unknown) => {
  console.error("Falló la prueba visual de filtros de citas:", error instanceof Error ? error.message : "Error desconocido");
  process.exitCode = 1;
});
