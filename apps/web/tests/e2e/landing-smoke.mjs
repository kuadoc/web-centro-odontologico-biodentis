import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Builder, By, Key, until } from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome.js";

// Sin cuentas ni escrituras: comprueba la landing y su catálogo público real.
const base = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const options = new chrome.Options().addArguments("--headless=new", "--disable-gpu", "--window-size=1440,1000");
if (process.env.CHROME_BINARY) options.setChromeBinaryPath(process.env.CHROME_BINARY);
const builder = new Builder().forBrowser("chrome").setChromeOptions(options);
if (process.env.SELENIUM_CHROMEDRIVER) builder.setChromeService(new chrome.ServiceBuilder(process.env.SELENIUM_CHROMEDRIVER));
const driver = await builder.build();

try {
  // El servidor de producción exige HTTPS tras el proxy. En loopback,
  // simular la cabecera del proxy TLS para probarlo sin certificados locales.
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(base)) {
    await driver.sendDevToolsCommand("Network.enable", {});
    await driver.sendDevToolsCommand("Network.setExtraHTTPHeaders", { headers: { "X-Forwarded-Proto": "https" } });
  }
  await driver.get(base);
  await driver.wait(until.elementLocated(By.css("#hero h1")), 20_000);
  assert.equal(await driver.getCurrentUrl(), `${base}/`);
  assert.equal(await driver.findElement(By.css("html")).getAttribute("lang"), "es");
  assert.equal((await driver.findElements(By.css("h1"))).length, 1);
  assert.equal((await driver.findElements(By.css("#especialidades button[aria-label^='Ver servicios de']"))).length, 9);
  const catalogResponse = await driver.executeAsyncScript(`const done = arguments[arguments.length - 1]; fetch('/api/public/services').then(async response => done({status:response.status, data:await response.json()})).catch(error=>done({error:String(error)}));`);
  assert.equal(catalogResponse.status, 200, "El catálogo debe responder sin sesión");
  assert.equal(catalogResponse.data.currency, "PEN");
  assert.ok(Array.isArray(catalogResponse.data.services));
  for (const service of catalogResponse.data.services) {
    assert.deepEqual(Object.keys(service).sort(), ["category", "description", "durationMinutes", "id", "name", "price", "specialty"]);
    assert.ok(service.price === null || (Number.isFinite(service.price) && service.price >= 0));
    assert.ok(service.specialty.length > 0);
  }
  await driver.wait(async () => (await driver.findElements(By.css("#servicios article[data-service-id]"))).length === catalogResponse.data.services.length, 15_000);
  const search = await driver.findElement(By.css("#servicios input[type='search']"));
  await search.sendKeys("servicio que no existe xyz");
  await driver.wait(async () => (await driver.findElements(By.css("#servicios article[data-service-id]"))).length === 0, 5000);
  assert.match(await driver.findElement(By.id("servicios")).getText(), /No encontramos coincidencias|No hay servicios disponibles/);
  await driver.findElement(By.css("#servicios button[aria-label='Limpiar búsqueda']")).click();
  await driver.wait(async () => (await driver.findElements(By.css("#servicios article[data-service-id]"))).length === catalogResponse.data.services.length, 5000);
  if (catalogResponse.data.services.length > 0) {
    const first = catalogResponse.data.services[0];
    await search.sendKeys(first.name);
    await driver.wait(until.elementLocated(By.css(`#servicios article[data-service-id='${first.id}']`)), 5000);
    const serviceCard = await driver.findElement(By.css(`#servicios article[data-service-id='${first.id}']`));
    assert.ok((await serviceCard.getText()).toLocaleLowerCase("es").includes(first.specialty.toLocaleLowerCase("es")));
    const inquiry = new URL(await serviceCard.findElement(By.css("a")).getAttribute("href"));
    assert.ok(inquiry.searchParams.get("text").includes(first.name));
    await driver.findElement(By.css("#servicios button[aria-label='Limpiar búsqueda']")).click();
    await driver.executeScript(`Array.from(document.querySelectorAll('#servicios [role="group"] button')).find(button => button.textContent === arguments[0]).click()`, first.specialty);
    const expected = catalogResponse.data.services.filter((service) => service.specialty === first.specialty);
    await driver.wait(async () => (await driver.findElements(By.css("#servicios article[data-service-id]"))).length === expected.length, 5000);
    await driver.executeScript(`const select = arguments[0]; Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(select, 'price'); select.dispatchEvent(new Event('change', { bubbles: true }));`, await driver.findElement(By.css("#servicios select")));
    const expectedIds = [...expected].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity) || a.name.localeCompare(b.name, "es")).map((service) => service.id);
    await driver.wait(async () => {
      const actual = await driver.executeScript(`return Array.from(document.querySelectorAll('#servicios article[data-service-id]')).map(card => card.dataset.serviceId)`);
      return JSON.stringify(actual) === JSON.stringify(expectedIds);
    }, 5000);
    await driver.executeScript(`document.querySelector('#servicios [role="group"] button').click()`);
  }
  const publicResponse = await driver.executeAsyncScript(`const done = arguments[arguments.length - 1]; fetch('/api/public/dentists').then(async response => done({status:response.status, data:await response.json()})).catch(error=>done({error:String(error)}));`);
  assert.equal(publicResponse.status, 200, "El directorio público debe responder sin autenticación");
  assert.ok(Array.isArray(publicResponse.data));
  for (const person of publicResponse.data) {
    assert.deepEqual(Object.keys(person).sort(), ["id", "licenseNumber", "specialty", "university", "user"]);
    assert.deepEqual(Object.keys(person.user).sort(), ["avatarUrl", "firstName", "lastName"]);
  }
  await driver.wait(async () => (await driver.findElements(By.css("#equipo article"))).length === publicResponse.data.length, 10_000);
  assert.match(await driver.findElement(By.css("#hero img")).getAttribute("src"), /images%2Fplena_operacion/);

  for (const size of [{ width: 1440, height: 1000 }, { width: 768, height: 1000 }, { width: 375, height: 812 }, { width: 320, height: 812 }]) {
    await driver.manage().window().setRect(size);
    await driver.sendDevToolsCommand("Emulation.setDeviceMetricsOverride", { ...size, deviceScaleFactor: 1, mobile: size.width < 768 });
    assert.equal(await driver.executeScript("return window.innerWidth"), size.width);
    assert.equal(await driver.executeScript("return document.documentElement.scrollWidth <= window.innerWidth"), true, `Desborde horizontal a ${size.width}px`);
    for (const image of await driver.findElements(By.css("main img"))) {
      await driver.executeScript("arguments[0].scrollIntoView({block: 'center'})", image);
      await driver.wait(() => driver.executeScript("return arguments[0].complete && arguments[0].naturalWidth > 0", image), 15_000);
      assert.match(await image.getAttribute("src"), /(?:%2Fimg%2F|\/img\/|%2Fimages%2F|\/images\/|^data:image\/)/);
    }
    await driver.executeScript("window.scrollTo(0, 0)");
    if (size.width === 1440 || size.width === 375) {
      const screenshot = path.join(tmpdir(), `biodentis-landing-${size.width}.png`);
      await fs.writeFile(screenshot, await driver.takeScreenshot(), "base64");
      console.log(`Captura: ${screenshot}`);
    }
  }

  const toggle = await driver.findElement(By.id("landing-menu-toggle"));
  await toggle.click();
  assert.equal(await toggle.getAttribute("aria-expanded"), "true");
  await driver.findElement(By.css("#landing-mobile-menu a[href='#servicios']")).click();
  assert.equal(await toggle.getAttribute("aria-expanded"), "false");

  const summary = await driver.findElement(By.css("#preguntas summary"));
  await driver.executeScript("arguments[0].scrollIntoView({block:'center'})", summary);
  await summary.click();
  assert.equal(await driver.findElement(By.css("#preguntas details")).getAttribute("open"), "true");

  await driver.executeScript("window.scrollTo(0, 0)");
  const theme = await driver.findElement(By.css("header button[aria-label^='Tema actual']"));
  const themeBefore = await theme.getAttribute("aria-label");
  await theme.click();
  await driver.wait(async () => (await theme.getAttribute("aria-label")) !== themeBefore, 5000);

  await driver.get(`${base}/dashboard`);
  await driver.wait(until.urlContains("/login?callbackUrl=%2Fdashboard"), 10_000);
  await driver.get(`${base}/`);
  await driver.findElement(By.css("#hero a[href^='/login?callbackUrl=']")).click();
  await driver.wait(until.urlContains("/login?callbackUrl=%2Fappointments%3Fnew%3D1"), 10_000);
  await driver.get(`${base}/register`);
  await driver.wait(until.elementLocated(By.id("firstName")), 10_000);
  assert.equal((await driver.findElements(By.css("select"))).length, 0, "El registro público debe ser para pacientes");

  // Solo se simulan fallos de lectura para verificar los estados visibles de la UI.
  // No se modifican las tarifas ni la base de datos.
  for (const scenario of [
    { status: 200, body: { currency: "PEN", services: [] }, text: "No hay servicios disponibles por el momento" },
    { status: 500, body: { error: "No disponible temporalmente" }, text: "No pudimos cargar nuestros servicios" },
  ]) {
    const injection = await driver.sendAndGetDevToolsCommand("Page.addScriptToEvaluateOnNewDocument", { source: `
      const actualFetch = window.fetch.bind(window);
      window.fetch = (input, options) => String(input).includes('/api/public/services')
        ? Promise.resolve(Response.json(${JSON.stringify(scenario.body)}, {status: ${scenario.status}}))
        : actualFetch(input, options);
    ` });
    try {
      await driver.get(base);
      await driver.wait(async () => (await driver.findElement(By.id("servicios")).getText()).includes(scenario.text), 15_000);
      assert.ok((await driver.findElements(By.css("#servicios a[href^='https://wa.me/']"))).length > 0);
    } finally {
      await driver.sendDevToolsCommand("Page.removeScriptToEvaluateOnNewDocument", { identifier: injection.identifier });
    }
  }
  console.log("OK: catálogo público, precios PEN, búsqueda, filtro por especialidad, orden por precio y estados vacío/error.");

  // Verificar el formulario administrativo y el procesamiento de fotos con
  // respuestas simuladas: esta parte no crea usuarios reales ni escribe en BD.
  await driver.sendDevToolsCommand("Page.addScriptToEvaluateOnNewDocument", { source: `
    const admin = {id:'browser-test-admin',role:'ADMIN',firstName:'Prueba',lastName:'Navegador',email:'test@example.test'};
    localStorage.setItem('accessToken','browser-test-only'); localStorage.setItem('user',JSON.stringify(admin));
    const realFetch = window.fetch.bind(window);
    window.fetch = async (input, options={}) => {
      const url = new URL(typeof input === 'string' ? input : input.url, location.origin);
      if (url.pathname === '/api/users' && options.method === 'POST') {
        window.__createdUserPayload = JSON.parse(options.body);
        return Response.json({id:'browser-test-created',...window.__createdUserPayload},{status:201});
      }
      if (url.pathname === '/api/users') return Response.json([]);
      if (url.pathname.startsWith('/api/')) return Response.json(admin);
      return realFetch(input, options);
    };
  ` });
  await driver.manage().addCookie({ name: "refresh_token", value: "browser-test-only", path: "/" });
  await driver.sendDevToolsCommand("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await driver.get(`${base}/users`);
  await driver.wait(until.elementLocated(By.xpath("//button[contains(., 'Nuevo Usuario')]")), 10_000);
  await driver.findElement(By.xpath("//button[contains(., 'Nuevo Usuario')]")).click();
  const dialog = "[role='dialog']";
  await driver.wait(until.elementLocated(By.css(`${dialog} input[type='file']`)), 5000);
  await driver.findElement(By.css(`${dialog} input[type='file']`)).sendKeys(path.resolve("apps/web/public/images/angel.jpg"));
  await driver.wait(until.elementLocated(By.css(`${dialog} img[src^='data:image/jpeg;base64,']`)), 10_000);
  const uploaded = await driver.findElement(By.css(`${dialog} img[src^='data:image/jpeg;base64,']`));
  await driver.wait(() => driver.executeScript("return arguments[0].complete", uploaded), 5000);
  assert.deepEqual(await driver.executeScript("return [arguments[0].naturalWidth,arguments[0].naturalHeight]", uploaded), [640, 768]);
  await driver.findElement(By.css(`${dialog} summary`)).click();
  const localPhoto = await driver.findElement(By.css(`${dialog} button[aria-label='Usar imagen maria.jpg']`));
  await driver.executeScript("arguments[0].scrollIntoView({block:'center'})", localPhoto);
  await localPhoto.click();
  await driver.findElement(By.css(`${dialog} input[placeholder='Ej. Roberto Carlos']`)).sendKeys("Prueba");
  await driver.findElement(By.css(`${dialog} input[placeholder='Ej. San Martín']`)).sendKeys("Navegador");
  await driver.findElement(By.css(`${dialog} input[type='email']`)).sendKeys("test@example.test");
  const specialty = await driver.findElement(By.id("create-specialty"));
  await specialty.sendKeys(Key.chord(Key.CONTROL, "a"), Key.BACK_SPACE, "Ortodoncia");
  const createButton = await driver.findElement(By.xpath("//button[contains(., 'Crear Usuario')]"));
  await driver.executeScript("arguments[0].scrollIntoView({block:'center'})", createButton);
  await createButton.click();
  await driver.wait(() => driver.executeScript("return Boolean(window.__createdUserPayload)"), 5000);
  const payload = await driver.executeScript("return window.__createdUserPayload");
  assert.equal(payload.avatarUrl, "/images/maria.jpg");
  assert.equal(payload.role, "DENTIST");
  assert.equal(payload.specialty, "Ortodoncia");
  console.log("OK: formulario administrativo, retrato a 640×768 y selección de foto local (sin escrituras reales).");
  console.log("OK: equipo desde BD sin datos privados, foto principal nueva, 4 tamaños sin desborde, imágenes, menú, FAQ, tema, login, registro y protección del panel.");
} finally {
  await driver.quit();
}
