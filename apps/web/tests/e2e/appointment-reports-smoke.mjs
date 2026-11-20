import assert from "node:assert/strict";
import process from "node:process";
import fs from "node:fs/promises";
import path from "node:path";
import { Builder, By, until } from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome.js";
import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const base = process.env.E2E_BASE_URL ?? "http://localhost:3000";
assert.match(base, /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/);
assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(new URL(process.env.DATABASE_URL).hostname));
const prisma = new PrismaClient();
const password = `ReportTest-${randomUUID()}`;
const userIds = [];
const options = new chrome.Options().addArguments("--headless=new", "--disable-gpu", "--window-size=1440,1100");
if (process.env.CHROME_BINARY) options.setChromeBinaryPath(process.env.CHROME_BINARY);
const builder = new Builder().forBrowser("chrome").setChromeOptions(options);
if (process.env.SELENIUM_CHROMEDRIVER) builder.setChromeService(new chrome.ServiceBuilder(process.env.SELENIUM_CHROMEDRIVER));
let driver;
try {
  const passwordHash = await bcrypt.hash(password, 10);
  const accounts = [];
  for (const role of ["ADMIN", "PATIENT"]) {
    const user = await prisma.user.create({ data: { email: `${randomUUID()}@example.invalid`, passwordHash, firstName: "Prueba", lastName: "Reportes", role } });
    accounts.push(user); userIds.push(user.id);
  }
  driver = await builder.build();
  await driver.sendDevToolsCommand("Network.enable", {});
  await driver.sendDevToolsCommand("Network.setExtraHTTPHeaders", { headers: { "X-Forwarded-Proto": "https" } });
  await driver.get(`${base}/login`);
  const loginScript = `const email=arguments[0],password=arguments[1],done=arguments[arguments.length-1]; fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})}).then(async r=>{const d=await r.json();if(r.ok){localStorage.setItem('accessToken',d.accessToken);localStorage.setItem('user',JSON.stringify(d.user));}done({status:r.status});}).catch(()=>done({status:0}));`;
  const login = await driver.executeAsyncScript(loginScript, accounts[0].email, password);
  assert.equal(login.status, 200, "La cuenta temporal local debe poder autenticarse");
  await driver.get(`${base}/reports/reassignments`);
  await driver.wait(until.elementLocated(By.css('select[aria-label="Período"]')), 30000);
  await driver.wait(until.elementLocated(By.css('[data-report-chart="Citas y atenciones realizadas"] .recharts-surface')), 30000);
  const text = await driver.findElement(By.css("main")).getText();
  for (const label of ["Atenciones realizadas", "Atendidas hasta hoy", "Ranking de odontólogos", "Especialidades atendidas", "Servicios realizados", "Recordatorios de citas"]) assert.ok(text.includes(label), `Falta ${label}`);
  await driver.findElement(By.css('select[aria-label="Período"] option[value="year"]')).click();
  await driver.wait(async () => (await driver.executeScript(`return document.querySelector('select[aria-label="Período"]').value`)) === "year", 5000);
  const api = await driver.executeAsyncScript(`const done=arguments[arguments.length-1],headers={Authorization:'Bearer '+localStorage.getItem('accessToken')}; Promise.all([fetch('/api/reports/appointments?period=year',{headers}).then(async r=>({status:r.status,data:await r.json()})),fetch('/api/reports/appointments/analytics-export?period=year',{headers}).then(async r=>({status:r.status,type:r.headers.get('content-type'),magic:Array.from(new Uint8Array(await r.arrayBuffer()).slice(0,2))}))]).then(done).catch(()=>done(null));`);
  assert.equal(api[0].status, 200); assert.equal(api[0].data.timeline.length, 12);
  assert.equal(api[1].status, 200); assert.match(api[1].type, /spreadsheetml/); assert.deepEqual(api[1].magic, [80, 75]);
  const paginationSelector = 'nav[aria-label="Paginación inferior de citas"]';
  assert.equal((await driver.findElements(By.css("#report-appointments-detail nav"))).length, 1, "El detalle debe tener una sola paginación");
  assert.equal(await driver.executeScript(`const table=document.querySelector('table[aria-label="Citas del reporte"]');return Boolean(table.parentElement.previousElementSibling.querySelector('h2')) && table.parentElement.nextElementSibling.matches('nav[aria-label="Paginación inferior de citas"]');`), true, "La cabecera debe preceder a las columnas y la paginación debe quedar después de las filas");
  const rowSelector = 'table[aria-label="Citas del reporte"] tbody tr[data-appointment-id]';
  const rows = async () => Promise.all((await driver.findElements(By.css(rowSelector))).map((row) => row.getAttribute("data-appointment-id")));
  await driver.findElement(By.xpath("//button[normalize-space(.)='Todas las citas']")).click();
  await driver.wait(async () => (await driver.findElement(By.css(paginationSelector)).getAttribute("aria-busy")) === "false", 15000);
  const firstPage = await rows();
  assert.equal(firstPage.length, Math.min(10, api[0].data.total));
  assert.ok((await driver.findElement(By.css(paginationSelector)).getText()).includes(`Mostrando ${api[0].data.total ? 1 : 0}-${firstPage.length} de ${api[0].data.total}`));
  if (api[0].data.total > 10) {
    await driver.findElement(By.css(`${paginationSelector} button[aria-label="Ir a página 2"]`)).click();
    await driver.wait(async () => (await driver.findElement(By.css(paginationSelector)).getAttribute("aria-busy")) === "false" && (await rows())[0] !== firstPage[0], 15000);
    const secondPage = await rows();
    assert.ok(secondPage.length > 0);
    assert.ok(secondPage.every((id) => !firstPage.includes(id)), "Las páginas no deben repetir filas");
    assert.ok((await driver.findElement(By.css(paginationSelector)).getText()).includes(`Mostrando 11-${10 + secondPage.length} de ${api[0].data.total}`));
    assert.equal(await driver.findElement(By.css('select[aria-label="Período"]')).getAttribute("value"), "year");
    await driver.findElement(By.css(`${paginationSelector} select option[value="20"]`)).click();
    await driver.wait(async () => (await driver.findElement(By.css(paginationSelector)).getAttribute("aria-busy")) === "false" && (await rows()).length === Math.min(20, api[0].data.total), 15000);
    assert.equal(await driver.findElement(By.css(`${paginationSelector} button[aria-current="page"]`)).getText(), "1");
    assert.ok((await driver.findElement(By.css(paginationSelector)).getText()).includes(`Mostrando 1-${Math.min(20, api[0].data.total)} de ${api[0].data.total}`));
    await driver.findElement(By.css(`${paginationSelector} select option[value="10"]`)).click();
    await driver.wait(async () => (await driver.findElement(By.css(paginationSelector)).getAttribute("aria-busy")) === "false" && (await rows()).length === 10, 15000);
  }
  const scheduledFilter = await driver.findElement(By.xpath("//button[normalize-space(.)='Programadas']"));
  await driver.executeScript("arguments[0].scrollIntoView({block:'center'})", scheduledFilter);
  await scheduledFilter.click();
  assert.equal(await driver.findElement(By.css(`${paginationSelector} button[aria-current="page"]`)).getText(), "1");
  await driver.executeScript("window.scrollTo(0,0)");
  const directory = path.resolve("tests/e2e/evidencias"); await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, "reporte-citas-desktop.png"), await driver.takeScreenshot(), "base64");
  const evolution = await driver.findElement(By.css('[data-report-chart="Citas y atenciones realizadas"]'));
  await driver.executeScript("arguments[0].scrollIntoView({block:'center'})", evolution);
  const chartBars = await evolution.findElements(By.css(".recharts-bar-rectangle"));
  const visibleBars = [];
  for (const bar of chartBars) { const rect = await bar.getRect(); if (rect.height > 1 && rect.width > 1) visibleBars.push(bar); }
  assert.ok(visibleBars.length > 0, "El gráfico anual debe tener barras con datos");
  await driver.actions().move({ origin: visibleBars[0] }).perform();
  await driver.wait(async () => (await evolution.findElements(By.css("[data-report-tooltip]"))).length > 0, 5000);
  assert.match(await evolution.findElement(By.css("[data-report-tooltip]")).getText(), /Citas totales/);
  assert.equal((await evolution.findElements(By.css('[data-slot="card-content"] > dl > div'))).length, 3);
  await driver.actions().move({ origin: await driver.findElement(By.css("main h1")) }).perform();
  await driver.executeScript("arguments[0].scrollIntoView({block:'center'})", evolution);
  await fs.writeFile(path.join(directory, "reporte-grafico-claro.png"), await driver.takeScreenshot(), "base64");
  if (api[0].data.specialties.length > 0 && api[0].data.specialties.length <= 6) {
    assert.equal((await driver.findElements(By.css('[data-report-chart="Especialidades atendidas"] .recharts-xAxis .recharts-cartesian-axis-tick'))).length, api[0].data.specialties.length, "Las especialidades visibles deben tener etiqueta");
  }
  await evolution.findElement(By.css('[data-slot="card-footer"] button')).click();
  await driver.wait(async () => await driver.executeScript("return document.activeElement.id === 'report-appointments-detail'"), 5000);
  await driver.executeScript("arguments[0].scrollIntoView({block:'start'})", await driver.findElement(By.xpath("//h2[contains(.,'Ranking de odontólogos')]")));
  await fs.writeFile(path.join(directory, "reporte-citas-rankings.png"), await driver.takeScreenshot(), "base64");
  await driver.executeScript("window.scrollTo(0,0)");
  await driver.manage().window().setRect({ width: 390, height: 844 });
  const overflow = await driver.executeScript("return document.documentElement.scrollWidth > window.innerWidth + 1");
  assert.equal(overflow, false, "La página móvil no debe desbordarse horizontalmente");
  await fs.writeFile(path.join(directory, "reporte-citas-mobile.png"), await driver.takeScreenshot(), "base64");
  await driver.executeScript("arguments[0].scrollIntoView({block:'start'})", await driver.findElement(By.css('[data-report-chart="Citas y atenciones realizadas"]')));
  assert.equal(await driver.executeScript("return document.documentElement.scrollWidth > window.innerWidth + 1"), false);
  await fs.writeFile(path.join(directory, "reporte-grafico-mobile.png"), await driver.takeScreenshot(), "base64");
  await driver.manage().window().setRect({ width: 1440, height: 1100 });
  const themeSelector = By.css('button[aria-label^="Tema actual:"]');
  for (let attempt = 0; attempt < 3; attempt++) {
    const themeLabel = await driver.findElement(themeSelector).getAttribute("aria-label");
    if (themeLabel.includes("oscuro")) break;
    await driver.findElement(themeSelector).click();
    await driver.wait(async () => (await driver.findElement(themeSelector).getAttribute("aria-label")) !== themeLabel, 5000);
  }
  assert.ok((await driver.findElement(By.css("html")).getAttribute("class")).includes("dark"));
  await driver.executeScript("arguments[0].scrollIntoView({block:'center'})", await driver.findElement(By.css('[data-report-chart="Citas y atenciones realizadas"]')));
  await fs.writeFile(path.join(directory, "reporte-grafico-oscuro.png"), await driver.takeScreenshot(), "base64");
  const changesTab = await driver.findElement(By.xpath("//button[normalize-space(.)='Cancelaciones y reasignaciones']"));
  await driver.executeScript("arguments[0].scrollIntoView({block:'center'})", changesTab);
  await changesTab.click();
  await driver.wait(until.elementLocated(By.css('[data-report-chart="Actividad de los últimos seis meses"] .recharts-surface')), 15000);
  const cancellationChart = await driver.findElement(By.css('[data-report-chart="Actividad de los últimos seis meses"]'));
  await driver.executeScript("arguments[0].scrollIntoView({block:'center'})", cancellationChart);
  assert.equal((await cancellationChart.findElements(By.css('[data-slot="card-content"] > dl > div'))).length, 3);
  assert.ok(await driver.findElement(By.css('[data-report-chart="Estado de las cancelaciones"] .recharts-surface')));
  await fs.writeFile(path.join(directory, "reporte-cancelaciones-graficos.png"), await driver.takeScreenshot(), "base64");
  await cancellationChart.findElement(By.css('[data-slot="card-footer"] button')).click();
  await driver.wait(async () => await driver.executeScript("return document.activeElement.id === 'report-cancellations-detail'"), 5000);
  await driver.executeAsyncScript(`const done=arguments[arguments.length-1];fetch('/api/auth/logout',{method:'POST'}).then(()=>{localStorage.clear();done();}).catch(()=>done());`);
  assert.equal((await driver.executeAsyncScript(loginScript, accounts[1].email, password)).status, 200);
  await driver.get(`${base}/reports/reassignments`);
  await driver.wait(until.elementLocated(By.css('select[aria-label="Período"]')), 15000);
  const patient = await driver.executeAsyncScript(`const done=arguments[arguments.length-1],headers={Authorization:'Bearer '+localStorage.getItem('accessToken')};Promise.all([fetch('/api/reports/appointments?period=year&patientId=otra-persona',{headers}).then(async r=>({status:r.status,data:await r.json()})),fetch('/api/reports/reassignments',{headers}).then(r=>r.status)]).then(done).catch(()=>done(null));`);
  assert.equal(patient[0].status, 200); assert.equal(patient[0].data.summary.total, 0); assert.equal(patient[1], 403);
  console.log("Reporte real: paginación con filas distintas, tamaño de página, filtros, Excel, vista móvil y privacidad del paciente verificados.");
} finally {
  if (driver) {
    await driver.executeAsyncScript(`const done=arguments[arguments.length-1];fetch('/api/auth/logout',{method:'POST'}).then(()=>done()).catch(()=>done());`).catch(() => {});
    await driver.quit();
  }
  if (userIds.length) await prisma.$transaction(async (tx) => {
    await tx.auditLog.deleteMany({ where: { userId: { in: userIds } } });
    await tx.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
    await tx.user.deleteMany({ where: { id: { in: userIds } } });
  });
  await prisma.$disconnect();
}
