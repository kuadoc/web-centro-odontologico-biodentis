import assert from "node:assert/strict";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { Builder, By, until } from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome";

/** Browser regression: real selection and UI, simulated PATCH to avoid uploading files. */
test("profile photo: selecting, removing and cancelling do not upload; only Save sends the image", {
  skip: process.env.E2E_PROFILE_PHOTO !== "1",
  timeout: 120_000,
}, async () => {
  const base = process.env.E2E_BASE_URL ?? "http://localhost:3000";
  assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
  const password = process.env.E2E_PASSWORD ?? process.env.SEED_DEMO_PASSWORD;
  assert.ok(password, "Configure E2E_PASSWORD or SEED_DEMO_PASSWORD");
  const options = new chrome.Options().addArguments("--headless=new", "--window-size=1440,1100");
  if (process.env.E2E_CHROME_BINARY) options.setChromeBinaryPath(process.env.E2E_CHROME_BINARY);
  const builder = new Builder().forBrowser("chrome").setChromeOptions(options);
  if (process.env.E2E_CHROMEDRIVER) builder.setChromeService(new chrome.ServiceBuilder(process.env.E2E_CHROMEDRIVER));
  const driver = await builder.build();
  const button = (label: string) => By.xpath(`//button[normalize-space()='${label}']`);
  const preview = By.css("img[src^='data:image/']");
  try {
    await driver.get(`${base}/login?callbackUrl=%2Fprofile`);
    await driver.wait(until.elementLocated(By.id("email")), 30_000);
    await driver.findElement(By.id("email")).sendKeys(process.env.E2E_EMAIL ?? "admin@biodentis.com");
    await driver.findElement(By.id("password")).sendKeys(password);
    await driver.findElement(By.css("button[type='submit']")).click();
    await driver.wait(async () => !(await driver.getCurrentUrl()).includes("/login"), 30_000);
    await driver.get(`${base}/profile`);
    await driver.wait(until.elementLocated(By.css("input[type='file']")), 40_000);
    await driver.executeScript(`
      window.photoRequests = [];
      window.photoFail = true;
      const originalFetch = window.fetch.bind(window);
      window.fetch = async (input, init) => {
        const url = typeof input === 'string' ? input : input.url;
        if (new URL(url, location.origin).pathname === '/api/profile' && init?.method === 'PATCH') {
          window.photoRequests.push(JSON.parse(init.body));
          await new Promise(resolve => setTimeout(resolve, 500));
          return new Response(JSON.stringify(window.photoFail ? {error: 'Simulated save failure'} : {}), {
            status: window.photoFail ? 500 : 200, headers: {'Content-Type': 'application/json'}
          });
        }
        return originalFetch(input, init);
      };
    `);
    const choose = async () => {
      await driver.findElement(By.css("input[type='file']")).sendKeys(path.resolve("public/images/angel.jpg"));
      await driver.wait(until.elementLocated(preview), 10_000);
      const save = await driver.wait(until.elementLocated(button("Guardar cambios")), 10_000);
      await driver.wait(until.elementIsEnabled(save), 10_000);
    };
    const requests = () => driver.executeScript<number>("return window.photoRequests.length");

    await choose();
    assert.equal((await driver.findElements(button("Guardar foto"))).length, 0);
    assert.equal((await driver.findElements(button("Guardar cambios"))).length, 1);
    assert.equal(await requests(), 0);
    await driver.findElement(button("Quitar foto")).click();
    await driver.wait(async () => (await driver.findElements(preview)).length === 0, 10_000);
    assert.equal(await requests(), 0);
    await driver.findElement(button("Cancelar")).click();
    await choose();
    await driver.findElement(button("Cancelar")).click();
    assert.equal((await driver.findElements(preview)).length, 0);
    assert.equal(await requests(), 0);

    await choose();
    await driver.executeScript(`const button = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Guardar cambios'); button.click(); button.click();`);
    await driver.wait(until.elementLocated(By.xpath("//*[@role='alert' and contains(.,'Simulated save failure')]")), 10_000);
    assert.equal(await requests(), 1);
    assert.equal(await driver.executeScript("return Object.hasOwn(window.photoRequests[0], 'phone') && Object.hasOwn(window.photoRequests[0], 'secondaryPhone')"), true);
    assert.equal((await driver.findElements(preview)).length, 1);
    assert.equal(await driver.executeScript("return window.photoRequests[0].avatarUrl.startsWith('data:image/jpeg')"), true);

    await driver.executeScript("window.photoFail = false");
    await driver.findElement(button("Guardar cambios")).click();
    await driver.wait(async () => (await driver.findElements(preview)).length === 0, 10_000);
    assert.equal(await requests(), 2);
    assert.equal(await driver.executeScript("return window.photoRequests[0].avatarUrl === window.photoRequests[1].avatarUrl"), true);
    await driver.findElement(button("Guardar cambios")).click();
    await driver.wait(async () => await requests() === 3, 10_000);
    assert.equal(await driver.executeScript("return Object.hasOwn(window.photoRequests[2], 'avatarUrl')"), false);

    await driver.get(`${base}/users`);
    await driver.wait(until.elementLocated(button("Nuevo Usuario")), 20_000);
    await driver.executeScript(`
      window.userPhotoRequests = [];
      const originalFetch = window.fetch.bind(window);
      window.fetch = async (input, init) => {
        const url = typeof input === 'string' ? input : input.url;
        if (new URL(url, location.origin).pathname === '/api/users' && init?.method === 'POST') {
          const body = JSON.parse(init.body);
          window.userPhotoRequests.push(body);
          await new Promise(resolve => setTimeout(resolve, 500));
          return new Response(JSON.stringify({id: crypto.randomUUID(), ...body, avatarUrl: '/api/uploads/odontologos/00000000-0000-4000-8000-000000000000.webp'}), {
            status: 201, headers: {'Content-Type': 'application/json'}
          });
        }
        return originalFetch(input, init);
      };
    `);
    await driver.findElement(button("Nuevo Usuario")).click();
    const input = await driver.wait(until.elementLocated(By.css("input[type='file']")), 10_000);
    assert.equal((await driver.findElements(By.css("details img[src^='/images/']"))).length, 0);
    await input.sendKeys(path.resolve("public/images/angel.jpg"));
    const portrait = await driver.wait(until.elementLocated(preview), 10_000);
    assert.equal(await driver.executeScript("return window.userPhotoRequests.length"), 0);
    const originalDataUrl = `data:image/jpeg;base64,${(await readFile(path.resolve("public/images/angel.jpg"))).toString("base64")}`;
    assert.equal(await portrait.getAttribute("src"), originalDataUrl);
    await driver.findElement(By.css("input[placeholder='Ej. Roberto Carlos']")).sendKeys("Prueba");
    await driver.findElement(By.css("input[type='email']")).sendKeys("photo-e2e@example.test");
    const create = await driver.findElement(button("Crear Usuario"));
    await driver.wait(until.elementIsEnabled(create), 10_000);
    await driver.executeScript("arguments[0].click(); arguments[0].click();", create);
    await driver.wait(async () => (await driver.findElements(By.css("input[type='file']"))).length === 0, 10_000);
    assert.equal(await driver.executeScript("return window.userPhotoRequests.length"), 1);
    assert.equal(await driver.executeScript("return window.userPhotoRequests[0].role === 'DENTIST' && window.userPhotoRequests[0].avatarUrl.startsWith('data:image/jpeg')"), true);
    assert.equal(await driver.executeScript("return window.userPhotoRequests[0].avatarUrl"), originalDataUrl);
  } finally {
    try {
      await driver.executeAsyncScript("const done=arguments[arguments.length-1];fetch('/api/auth/logout',{method:'POST'}).then(()=>done(),()=>done());");
    } finally {
      await driver.quit();
    }
  }
});
