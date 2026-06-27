const { test, expect } = require('@playwright/test');

// Helper: sluit cart sidebar (overlay blokkeert pagina-knoppen)
async function closeCartSidebar(page) {
  // Wacht tot sidebar open is (addToCart opent asynchroon)
  await expect(page.locator('#cart-sidebar')).toHaveClass(/open/, { timeout: 5000 }).catch(() => {});
  await page.evaluate(() => {
    const sidebar = document.getElementById('cart-sidebar');
    if (sidebar) sidebar.classList.remove('open');
  });
}

// Helper: open cart sidebar via JS (knop kan geblokkeerd zijn door overlay)
async function openCartSidebar(page) {
  await page.evaluate(() => {
    const sidebar = document.getElementById('cart-sidebar');
    if (!sidebar.classList.contains('open')) {
      sidebar.classList.add('open');
      loadCart();
    }
  });
}

// ============ LOGIN TESTS ============

test.describe('Login', () => {
  test('loginpagina is toegankelijk', async ({ page }) => {
    await page.goto('/');
    await page.click('#login-btn');
    await expect(page.locator('#login-modal')).toHaveClass(/active/);
    await expect(page.locator('[data-testid="login-email"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-password"]')).toBeVisible();
  });

  test('succesvol inloggen met geldige gegevens', async ({ page }) => {
    await page.goto('/');
    await page.click('#login-btn');
    await page.fill('[data-testid="login-email"]', 'steven@example.com');
    await page.fill('[data-testid="login-password"]', 'welkom123');
    await page.click('[data-testid="login-submit"]');
    await expect(page.locator('#user-info')).toHaveText(/Steven/);
    await expect(page.locator('#login-btn')).not.toBeVisible();
    await expect(page.locator('#logout-btn')).toBeVisible();
  });

  test('inloggen met ongeldige gegevens toont foutmelding', async ({ page }) => {
    await page.goto('/');
    await page.click('#login-btn');
    await page.fill('[data-testid="login-email"]', 'fout@example.com');
    await page.fill('[data-testid="login-password"]', 'verkeerd');
    await page.click('[data-testid="login-submit"]');
    await expect(page.locator('#login-error')).toBeVisible();
  });

  test('inloggen met lege velden toont foutmelding', async ({ page }) => {
    await page.goto('/');
    await page.click('#login-btn');
    await page.click('[data-testid="login-submit"]');
    await expect(page.locator('#login-error')).toBeVisible();
  });

  test('uitloggen werkt correct', async ({ page }) => {
    await page.goto('/');
    // Eerst inloggen
    await page.click('#login-btn');
    await page.fill('[data-testid="login-email"]', 'steven@example.com');
    await page.fill('[data-testid="login-password"]', 'welkom123');
    await page.click('[data-testid="login-submit"]');
    await expect(page.locator('#user-info')).toHaveText(/Steven/);
    // Uitloggen
    await page.click('#logout-btn');
    await expect(page.locator('#login-btn')).toBeVisible();
    await expect(page.locator('#logout-btn')).not.toBeVisible();
  });

  test('login modal sluit na succesvolle login', async ({ page }) => {
    await page.goto('/');
    await page.click('#login-btn');
    await expect(page.locator('#login-modal')).toHaveClass(/active/);
    await page.fill('[data-testid="login-email"]', 'steven@example.com');
    await page.fill('[data-testid="login-password"]', 'welkom123');
    await page.click('[data-testid="login-submit"]');
    // Modal moet weg zijn
    await expect(page.locator('#login-modal')).not.toHaveClass(/active/);
    await expect(page.locator('#user-info')).toHaveText(/Steven/);
  });

  test('tweede gebruiker kan inloggen', async ({ page }) => {
    await page.goto('/');
    await page.click('#login-btn');
    await page.fill('[data-testid="login-email"]', 'test@example.com');
    await page.fill('[data-testid="login-password"]', 'test123');
    await page.click('[data-testid="login-submit"]');
    await expect(page.locator('#user-info')).toHaveText(/Testgebruiker/);
    await expect(page.locator('#logout-btn')).toBeVisible();
  });
});

// ============ PRODUCTEN TESTS ============

test.describe('Producten', () => {
  test('producten worden geladen op de pagina', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.product-card')).toHaveCount(6);
  });

  test('product heeft naam, prijs en knop', async ({ page }) => {
    await page.goto('/');
    const first = page.locator('.product-card').first();
    await expect(first.locator('h3')).toBeVisible();
    await expect(first.locator('.price')).toBeVisible();
    await expect(first.locator('button')).toBeVisible();
  });

  test('product heeft beschrijving en emoji', async ({ page }) => {
    await page.goto('/');
    const first = page.locator('.product-card').first();
    // Emoji
    await expect(first.locator('.emoji')).toBeVisible();
    // Beschrijving
    await expect(first.locator('p')).toBeVisible();
    await expect(first.locator('p')).not.toHaveText('');
  });
});

// ============ WINKELWAGEN TESTS ============

test.describe('Winkelwagen', () => {
  test('winkelwagen is initeel leeg', async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("Winkelwagen")');
    await expect(page.locator('#cart-sidebar')).toHaveClass(/open/);
    await expect(page.locator('#cart-items')).toContainText('leeg');
  });

  test('product toevoegen aan winkelwagen', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="add-to-cart-1"]');
    // Wacht op toast
    await expect(page.locator('#toast')).toHaveClass(/show/);
    // Controleer teller
    await expect(page.locator('#cart-count')).toHaveText('1');
  });

  test('meerdere producten toevoegen', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="add-to-cart-1"]');
    await closeCartSidebar(page);
    await page.click('[data-testid="add-to-cart-2"]');
    await closeCartSidebar(page);
    await page.click('[data-testid="add-to-cart-3"]');
    await expect(page.locator('#cart-count')).toHaveText('3');
  });

  test('product uit winkelwagen verwijderen', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="add-to-cart-1"]');
    await closeCartSidebar(page);
    await page.click('[data-testid="add-to-cart-2"]');
    await closeCartSidebar(page);
    // Open sidebar via JS (knop kan geblokkeerd zijn)
    await page.evaluate(() => document.getElementById('cart-sidebar').classList.add('open'));
    await page.evaluate(() => window.loadCart());
    await expect(page.locator('#cart-sidebar')).toHaveClass(/open/);
    await page.click('[data-testid="remove-1"]');
    // Nog 1 item over
    await expect(page.locator('#cart-count')).toHaveText('1');
  });

  test('totaal wordt berekend', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="add-to-cart-1"]'); // €29.99
    await closeCartSidebar(page);
    await page.click('[data-testid="add-to-cart-2"]'); // €24.99
    await closeCartSidebar(page);
    await page.click('button:has-text("Winkelwagen")');
    await expect(page.locator('#cart-total')).toHaveText('54.98');
  });

  test('cart count update correct na meerdere toevoegingen', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="add-to-cart-1"]');
    await closeCartSidebar(page);
    await expect(page.locator('#cart-count')).toHaveText('1');
    await page.click('[data-testid="add-to-cart-2"]');
    await closeCartSidebar(page);
    await expect(page.locator('#cart-count')).toHaveText('2');
    await page.click('[data-testid="add-to-cart-3"]');
    await expect(page.locator('#cart-count')).toHaveText('3');
  });

  test('cart count update na verwijderen', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="add-to-cart-1"]');
    await closeCartSidebar(page);
    await page.click('[data-testid="add-to-cart-2"]');
    await closeCartSidebar(page);
    await page.click('[data-testid="add-to-cart-3"]');
    await expect(page.locator('#cart-count')).toHaveText('3');
    // Open sidebar via JS (knop kan geblokkeerd zijn) en verwijder 1
    await openCartSidebar(page);
    await page.locator('[data-testid="remove-1"]').scrollIntoViewIfNeeded();
    await page.click('[data-testid="remove-1"]');
    await expect(page.locator('#cart-count')).toHaveText('2');
  });

  test('winkelwagen sidebar openen en sluiten', async ({ page }) => {
    await page.goto('/');
    // Openen
    await page.click('button:has-text("Winkelwagen")');
    await expect(page.locator('#cart-sidebar')).toHaveClass(/open/);
    // Sluiten
    await closeCartSidebar(page);
    await expect(page.locator('#cart-sidebar')).not.toHaveClass(/open/);
    // Opnieuw openen
    await page.click('button:has-text("Winkelwagen")');
    await expect(page.locator('#cart-sidebar')).toHaveClass(/open/);
  });

  test('dubbel toevoegen vanzelfde product verhoogt hoeveelheid', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="add-to-cart-1"]');
    await closeCartSidebar(page);
    await page.click('[data-testid="add-to-cart-1"]');
    // Count moet 2 zijn (zelfde product, hoeveelheid verhoogd)
    await expect(page.locator('#cart-count')).toHaveText('2');
    // Open winkelwagen en check hoeveelheid
    await page.click('button:has-text("Winkelwagen")');
    await expect(page.locator('#cart-items')).toContainText('× 2');
  });

  test('winkelwagen items verdwijnen na uitloggen', async ({ page }) => {
    await page.goto('/');
    // Product toevoegen zonder in te loggen
    await page.click('[data-testid="add-to-cart-1"]');
    await closeCartSidebar(page);
    // Zorg dat sidebar echt dicht is
    await expect(page.locator('#cart-sidebar')).not.toHaveClass(/open/);
    await expect(page.locator('#cart-count')).toHaveText('1');
    // Inloggen
    await page.click('#login-btn');
    await page.fill('[data-testid="login-email"]', 'steven@example.com');
    await page.fill('[data-testid="login-password"]', 'welkom123');
    await page.click('[data-testid="login-submit"]');
    // Sluit sidebar als die open is na login
    await closeCartSidebar(page);
    // Cart count moet nog steeds 1 zijn (session blijft bij login)
    await expect(page.locator('#cart-count')).toHaveText('1');
    // Uitloggen
    await page.click('#logout-btn');
    // Cart moet leeg zijn na uitloggen (session destroyed)
    // De frontend reset cartCount naar 0 via loadCart() na logout
    await expect(page.locator('#cart-count')).toHaveText('0');
  });

  test('meerdere producten met verschillende hoeveelheden in totaal', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="add-to-cart-1"]'); // €29.99
    await closeCartSidebar(page);
    await page.click('[data-testid="add-to-cart-1"]'); // €29.99 (x2)
    await closeCartSidebar(page);
    await page.click('[data-testid="add-to-cart-4"]'); // €59.99
    await closeCartSidebar(page);
    await page.click('[data-testid="add-to-cart-6"]'); // €12.99
    await closeCartSidebar(page);
    // Totaal: 29.99*2 + 59.99 + 12.99 = 132.96
    await page.click('button:has-text("Winkelwagen")');
    await expect(page.locator('#cart-total')).toHaveText('132.96');
  });
});

// ============ CHECKOUT TESTS ============

test.describe('Checkout', () => {
  test('checkout zonder inloggen geeft fout', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="add-to-cart-1"]');
    await closeCartSidebar(page);
    await openCartSidebar(page);
    await page.locator('#checkout-btn').scrollIntoViewIfNeeded();
    await page.click('#checkout-btn');
    await expect(page.locator('#toast')).toContainText('ingelogd');
  });

  test('checkout met ingelogde gebruiker succesvol', async ({ page }) => {
    await page.goto('/');
    // Inloggen
    await page.click('#login-btn');
    await page.fill('[data-testid="login-email"]', 'steven@example.com');
    await page.fill('[data-testid="login-password"]', 'welkom123');
    await page.click('[data-testid="login-submit"]');
    // Producten toevoegen (sluit sidebar tussen elke add-to-cart)
    await page.click('[data-testid="add-to-cart-1"]');
    await closeCartSidebar(page);
    await page.click('[data-testid="add-to-cart-3"]');
    await closeCartSidebar(page);
    await page.click('[data-testid="add-to-cart-5"]');
    await closeCartSidebar(page);
    // Open winkelwagen via JS (knop kan geblokkeerd zijn) en checkout
    await openCartSidebar(page);
    await page.click('#checkout-btn');
    // Succes!
    await expect(page.locator('.checkout-success')).toBeVisible();
    await expect(page.locator('.checkout-success h2')).toHaveText('Bestelling geplaatst!');
    // Order summary check
    await expect(page.locator('.order-summary')).toContainText('Laptop Hoesje');
    await expect(page.locator('.order-summary')).toContainText('USB-C Hub');
    await expect(page.locator('.order-summary')).toContainText('Webcam HD');
    // Totaal = 29.99 + 39.99 + 44.99 = 114.97
    await expect(page.locator('.order-summary .order-total')).toContainText('114.97');
  });

  test('checkout met lege winkelwagen geeft fout', async ({ page }) => {
    await page.goto('/');
    // Inloggen
    await page.click('#login-btn');
    await page.fill('[data-testid="login-email"]', 'steven@example.com');
    await page.fill('[data-testid="login-password"]', 'welkom123');
    await page.click('[data-testid="login-submit"]');
    // Geen producten toevoegen
    await page.click('button:has-text("Winkelwagen")');
    await page.click('#checkout-btn');
    await expect(page.locator('#toast')).toContainText('leeg');
  });

  test('checkout zonder inloggen geeft geen bestelling en blijft bij login', async ({ page }) => {
    await page.goto('/');
    // Zorg dat je niet ingelogd bent
    await page.click('[data-testid="add-to-cart-1"]');
    await closeCartSidebar(page);
    await page.click('[data-testid="add-to-cart-2"]');
    await closeCartSidebar(page);
    await openCartSidebar(page);
    await page.locator('#checkout-btn').scrollIntoViewIfNeeded();
    await page.click('#checkout-btn');
    // Moet login modal openen
    await expect(page.locator('#login-modal')).toHaveClass(/active/);
    // Winkelwagen moet nog steeds items bevatten (geen bestelling geplaatst)
    await expect(page.locator('#cart-count')).toHaveText('2');
  });

  test('order ID wordt getoond in bestelling', async ({ page }) => {
    await page.goto('/');
    // Inloggen
    await page.click('#login-btn');
    await page.fill('[data-testid="login-email"]', 'steven@example.com');
    await page.fill('[data-testid="login-password"]', 'welkom123');
    await page.click('[data-testid="login-submit"]');
    // Product toevoegen en checkout (sidebar opent automatisch)
    await page.click('[data-testid="add-to-cart-1"]');
    await page.click('#checkout-btn');
    // Order summary moet een Bestelling # bevatten
    await expect(page.locator('.order-summary')).toContainText('Bestelling #');
  });

  test('checkout knop herstelt na 3 seconden', async ({ page }) => {
    await page.goto('/');
    // Inloggen
    await page.click('#login-btn');
    await page.fill('[data-testid="login-email"]', 'steven@example.com');
    await page.fill('[data-testid="login-password"]', 'welkom123');
    await page.click('[data-testid="login-submit"]');
    // Product toevoegen en checkout (sidebar opent automatisch)
    await page.click('[data-testid="add-to-cart-1"]');
    await page.click('#checkout-btn');
    // Succes pagina
    await expect(page.locator('.checkout-success')).toBeVisible();
    // Checkout knop moet verdwenen zijn
    await expect(page.locator('#checkout-btn')).not.toBeVisible();
    // Wacht 4 seconden (timeout is 3s)
    await page.waitForTimeout(4000);
    // Checkout knop moet terug zijn
    await expect(page.locator('#checkout-btn')).toBeVisible();
  });
});

// ============ CONTACTFORMULIER TESTS ============

test.describe('Contactformulier', () => {
  test('contactformulier wordt weergegeven', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.contact-section')).toBeVisible();
    await expect(page.locator('.contact-section h2')).toHaveText('📬 Contact');
    await expect(page.locator('[data-testid="contact-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="contact-email"]')).toBeVisible();
    await expect(page.locator('[data-testid="contact-subject"]')).toBeVisible();
    await expect(page.locator('[data-testid="contact-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="contact-submit"]')).toBeVisible();
  });

  test('contactformulier succesvol indienen', async ({ page }) => {
    await page.goto('/');
    await page.fill('[data-testid="contact-name"]', 'Steven');
    await page.fill('[data-testid="contact-email"]', 'steven@example.com');
    await page.fill('[data-testid="contact-subject"]', 'Testbericht');
    await page.fill('[data-testid="contact-message"]', 'Dit is een testbericht vanuit Playwright!');
    await page.click('[data-testid="contact-submit"]');
    // Succesmelding moet verschijnen
    await expect(page.locator('#contact-success')).toHaveClass(/show/);
    await expect(page.locator('#contact-success h3')).toHaveText('Bericht verzonden!');
  });

  test('contactformulier validatie bij lege velden', async ({ page }) => {
    await page.goto('/');
    // Alles leeg indienen — JS validatie moet foutmeldingen tonen
    await page.click('[data-testid="contact-submit"]');
    // Eigen foutmeldingen moeten verschijnen
    await expect(page.locator('#contact-name-error')).toBeVisible();
    await expect(page.locator('#contact-email-error')).toBeVisible();
    await expect(page.locator('#contact-subject-error')).toBeVisible();
    await expect(page.locator('#contact-message-error')).toBeVisible();
    // Formulier moet zichtbaar blijven (niet verzonden)
    await expect(page.locator('#contact-success')).not.toHaveClass(/show/);
  });

  test('contactformulier validatie bij ongeldig e-mailadres', async ({ page }) => {
    await page.goto('/');
    await page.fill('[data-testid="contact-name"]', 'Steven');
    await page.fill('[data-testid="contact-email"]', 'ongeldig-email');
    await page.fill('[data-testid="contact-subject"]', 'Test');
    await page.fill('[data-testid="contact-message"]', 'Testbericht');
    await page.click('[data-testid="contact-submit"]');
    // E-mail foutmelding moet 'Ongeldig e-mailadres' tonen
    await expect(page.locator('#contact-email-error')).toBeVisible();
    await expect(page.locator('#contact-email-error')).toHaveText('Ongeldig e-mailadres');
    // Formulier niet verzonden
    await expect(page.locator('#contact-success')).not.toHaveClass(/show/);
  });

  test('contactformulier is toegankelijk zonder inloggen', async ({ page }) => {
    await page.goto('/');
    // Zorg dat je niet ingelogd bent
    await expect(page.locator('#login-btn')).toBeVisible();
    // Contactformulier moet wel zichtbaar zijn
    await expect(page.locator('.contact-section')).toBeVisible();
    await page.fill('[data-testid="contact-name"]', 'Gast');
    await page.fill('[data-testid="contact-email"]', 'gast@example.com');
    await page.fill('[data-testid="contact-subject"]', 'Vraag');
    await page.fill('[data-testid="contact-message"]', 'Ik heb een vraag zonder in te loggen.');
    await page.click('[data-testid="contact-submit"]');
    await expect(page.locator('#contact-success')).toHaveClass(/show/);
  });

  test('contactformulier reset na succesvolle verzending', async ({ page }) => {
    await page.goto('/');
    await page.fill('[data-testid="contact-name"]', 'Steven');
    await page.fill('[data-testid="contact-email"]', 'steven@example.com');
    await page.fill('[data-testid="contact-subject"]', 'Reset test');
    await page.fill('[data-testid="contact-message"]', 'Test of het formulier reset na verzending.');
    await page.click('[data-testid="contact-submit"]');
    await expect(page.locator('#contact-success')).toHaveClass(/show/);
    // Wacht op reset (4 seconden in de code)
    await page.waitForTimeout(5000);
    // Formulier moet weer zichtbaar en leeg zijn
    await expect(page.locator('#contact-form')).toBeVisible();
    await expect(page.locator('[data-testid="contact-name"]')).toHaveValue('');
    await expect(page.locator('[data-testid="contact-email"]')).toHaveValue('');
  });

  test('toast bericht verschijnt en verdwijnt', async ({ page }) => {
    await page.goto('/');
    // Product toevoegen moet toast tonen
    await page.click('[data-testid="add-to-cart-1"]');
    await expect(page.locator('#toast')).toHaveClass(/show/);
    await expect(page.locator('#toast')).toContainText('Toegevoegd');
    // Toast moet verdwijnen na 2.5 seconden
    await page.waitForTimeout(3000);
    await expect(page.locator('#toast')).not.toHaveClass(/show/);
  });

  test('submit button en tekst tijdens verzenden', async ({ page }) => {
    await page.goto('/');
    await page.fill('[data-testid="contact-name"]', 'Steven');
    await page.fill('[data-testid="contact-email"]', 'steven@example.com');
    await page.fill('[data-testid="contact-subject"]', 'Test');
    await page.fill('[data-testid="contact-message"]', 'Testbericht');
    const btn = page.locator('[data-testid="contact-submit"]');
    await expect(btn).toBeEnabled();
    await expect(btn).toHaveText('Verstuur bericht');
    // Click submit
    await btn.click();
    // Na succesvolle fetch moet button weer enabled zijn en originele tekst hebben
    await expect(btn).toBeEnabled({ timeout: 10000 });
    await expect(btn).toHaveText('Verstuur bericht');
    // Succesmelding moet zichtbaar zijn
    await expect(page.locator('#contact-success')).toHaveClass(/show/);
  });

  test('email veld onblur validatie bij ongeldig formaat', async ({ page }) => {
    await page.goto('/');
    // Vul een ongeldig e-mailadres in en trigger onblur
    await page.fill('[data-testid="contact-email"]', 'ongeldig-email');
    // Klik ergens anders om blur te triggeren
    await page.click('[data-testid="contact-name"]');
    // onblur van email veld moet foutmelding tonen
    await expect(page.locator('#contact-email-error')).toBeVisible();
    await expect(page.locator('#contact-email-error')).toHaveText('Ongeldig e-mailadres');
  });
});

// ============ CONTACTEN PAGINA TESTS ============

test.describe('Contacten Pagina', () => {
  test('contacten pagina wordt geladen', async ({ page }) => {
    await page.goto('/api/contacts');
    await expect(page.locator('.contacten-header h1')).toHaveText('📬 Contacten');
    await expect(page.locator('#total-count')).toBeVisible();
    await expect(page.locator('#today-count')).toBeVisible();
    await expect(page.locator('#search')).toBeVisible();
  });

  test('contacten pagina toont berichten', async ({ page }) => {
    await page.goto('/api/contacts');
    // Wacht tot berichten geladen zijn
    await expect(page.locator('.contact-card').first()).toBeVisible({ timeout: 10000 });
    // Er moet minstens 1 contactkaart zijn
    const count = await page.locator('.contact-card').count();
    expect(count).toBeGreaterThan(0);
  });

  test('contactkaart bevat naam, email, onderwerp en bericht', async ({ page }) => {
    await page.goto('/api/contacts');
    await expect(page.locator('.contact-card').first()).toBeVisible({ timeout: 10000 });
    const first = page.locator('.contact-card').first();
    await expect(first.locator('.contact-name')).toBeVisible();
    await expect(first.locator('.contact-email')).toBeVisible();
    await expect(first.locator('.contact-subject')).toBeVisible();
    await expect(first.locator('.contact-message')).toBeVisible();
  });

  test('contacten pagina statistieken zijn zichtbaar', async ({ page }) => {
    await page.goto('/api/contacts');
    await expect(page.locator('#total-count')).toBeVisible();
    await expect(page.locator('#today-count')).toBeVisible();
    // Totaal moet een getal zijn
    const total = await page.locator('#total-count').textContent();
    expect(parseInt(total)).toBeGreaterThan(0);
  });

  test('zoekfunctie filtert contacten', async ({ page }) => {
    await page.goto('/api/contacts');
    await expect(page.locator('.contact-card').first()).toBeVisible({ timeout: 10000 });
    // Zoek op een bestaande naam
    await page.fill('#search', 'Steven');
    await page.waitForTimeout(1000);
    // Moet resultaten hebben
    const results = await page.locator('.contact-card').count();
    expect(results).toBeGreaterThan(0);
    // Alle resultaten moeten "Steven" bevatten
    for (let i = 0; i < results; i++) {
      const name = await page.locator('.contact-card').nth(i).locator('.contact-name').textContent();
      expect(name).toContain('Steven');
    }
  });

  test('zoekfunctie met geen resultaten toont empty state', async ({ page }) => {
    await page.goto('/api/contacts');
    await expect(page.locator('.contact-card').first()).toBeVisible({ timeout: 10000 });
    // Zoek op iets dat niet bestaat
    await page.fill('#search', 'xyznonexistent123');
    await page.waitForTimeout(1000);
    // Geen contactkaarten meer
    await expect(page.locator('.contact-card')).toHaveCount(0);
    // Empty state moet zichtbaar zijn
    await expect(page.locator('.empty-state')).toBeVisible();
  });

  test('zoek resetten toont alle contacten', async ({ page }) => {
    await page.goto('/api/contacts');
    await expect(page.locator('.contact-card').first()).toBeVisible({ timeout: 10000 });
    // Eerst zoeken
    await page.fill('#search', 'Steven');
    await page.waitForTimeout(1000);
    const filtered = await page.locator('.contact-card').count();
    // Dan resetten
    await page.fill('#search', '');
    await page.waitForTimeout(1000);
    const all = await page.locator('.contact-card').count();
    // Alles moet meer zijn dan gefilterd
    expect(all).toBeGreaterThan(filtered);
  });

  test('nieuw contact via formulier verschijnt op contacten pagina', async ({ page }) => {
    // Stap 1: Ga naar hoofdpagina en vul formulier in
    await page.goto('/');
    await page.fill('[data-testid="contact-name"]', 'Playwright E2E Test');
    await page.fill('[data-testid="contact-email"]', 'e2e@test.nl');
    await page.fill('[data-testid="contact-subject"]', 'Automatische test');
    await page.fill('[data-testid="contact-message"]', 'Deze test is automatisch gegenereerd door Playwright!');
    await page.click('#contact-submit');
    await expect(page.locator('#contact-success')).toHaveClass(/show/);

    // Stap 2: Wacht op reset en navigeer naar contacten pagina
    await page.waitForTimeout(5000);
    await page.goto('/api/contacts');

    // Stap 3: Wacht tot de nieuwe entry zichtbaar is
    await expect(page.locator('text=Playwright E2E Test').first()).toBeVisible({ timeout: 10000 });

    // Stap 4: Check de details
    const cards = page.locator('.contact-card');
    const count = await cards.count();
    let found = false;
    for (let i = 0; i < count; i++) {
      const name = await cards.nth(i).locator('.contact-name').textContent();
      if (name === 'Playwright E2E Test') {
        found = true;
        await expect(cards.nth(i).locator('.contact-email')).toContainText('e2e@test.nl');
        await expect(cards.nth(i).locator('.contact-subject')).toContainText('Automatische test');
        break;
      }
    }
    expect(found).toBe(true);
  });

  test('contacten pagina is toegankelijk zonder inloggen', async ({ page }) => {
    await page.goto('/api/contacts');
    // Pagina moet laden zonder login
    await expect(page.locator('.contacten-header h1')).toHaveText('📬 Contacten');
    // Login knop moet nog steeds zichtbaar zijn op de hoofdpagina
    await page.goto('/');
    await expect(page.locator('#login-btn')).toBeVisible();
  });
});

// ============ RATINGS TESTS ============

test.describe('Ratings', () => {
  test('/api/ratings geeft lijst van alle producten met ratings', async ({ request }) => {
    const res = await request.get('/api/ratings');
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(Array.isArray(data)).toBeTruthy();
    expect(data.length).toBeGreaterThanOrEqual(6);
    const first = data[0];
    expect(first).toHaveProperty('productId');
    expect(first).toHaveProperty('average');
    expect(first).toHaveProperty('count');
  });

  test('/api/rating POST voegt een rating toe', async ({ request }) => {
    const res = await request.post('/api/rating', {
      data: { productId: 1, rating: 5 }
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.average).toBeGreaterThanOrEqual(1);
    expect(data.average).toBeLessThanOrEqual(5);
    expect(data.count).toBeGreaterThanOrEqual(1);
  });

  test('/api/rating POST met ongeldige data geeft 400', async ({ request }) => {
    // Geen rating
    const res1 = await request.post('/api/rating', { data: { productId: 1 } });
    expect(res1.status()).toBe(400);
    // Rating buiten bereik
    const res2 = await request.post('/api/rating', { data: { productId: 1, rating: 6 } });
    expect(res2.status()).toBe(400);
    // Geen productId
    const res3 = await request.post('/api/rating', { data: { rating: 3 } });
    expect(res3.status()).toBe(400);
  });

  test('product pagina toont sterrenrating', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.star-rating').first()).toBeVisible();
    await expect(page.locator('.star-rating .star').first()).toBeVisible();
  });

  test('ster wordt gevuld bij klik', async ({ page }) => {
    await page.goto('/');
    const firstStar = page.locator('.star-rating').first().locator('.star').nth(2);
    await firstStar.click();
    // Na klik moet de rating info zichtbaar zijn
    const ratingInfo = page.locator('.star-rating').first().locator('.rating-info');
    await expect(ratingInfo).toBeVisible({ timeout: 5000 });
  });
});

// ============ DAILY DEAL TESTS ============

test.describe('Daily Deal', () => {
  test('/api/daily-deal geeft een product met korting', async ({ request }) => {
    const res = await request.get('/api/daily-deal');
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data).toHaveProperty('product');
    expect(data).toHaveProperty('discount');
    expect(data).toHaveProperty('originalPrice');
    expect(data).toHaveProperty('dealPrice');
    expect(data.product).toHaveProperty('id');
    expect(data.product).toHaveProperty('name');
    expect(data.discount).toBeGreaterThan(0);
    expect(data.discount).toBeLessThan(1);
    expect(data.dealPrice).toBeLessThan(data.originalPrice);
  });

  test('/api/daily-deal heeft countdown met hours, minutes, seconds', async ({ request }) => {
    const res = await request.get('/api/daily-deal');
    const data = await res.json();
    expect(data.countdown).toHaveProperty('hours');
    expect(data.countdown).toHaveProperty('minutes');
    expect(data.countdown).toHaveProperty('seconds');
    expect(data.countdown.hours).toBeGreaterThanOrEqual(0);
    expect(data.countdown.hours).toBeLessThan(24);
  });

  test('daily deal wordt weergegeven op de pagina', async ({ page }) => {
    await page.goto('/');
    const deal = page.locator('#daily-deal');
    await expect(deal).toBeVisible();
    await expect(deal.locator('.deal-product')).toBeVisible();
    await expect(deal.locator('.countdown-timer')).toBeVisible();
  });

  test('daily deal add to cart knop werkt', async ({ page }) => {
    await page.goto('/');
    const addBtn = page.locator('#daily-deal .deal-add-btn');
    await expect(addBtn).toBeVisible();
    await addBtn.click();
    // Wacht op toast en dat hij verdwijnt
    await expect(page.locator('.toast')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.toast')).not.toBeVisible({ timeout: 5000 });
    // Cart knop moet beschikbaar zijn
    await expect(page.locator('button:has-text("Winkelwagen")')).toBeVisible({ timeout: 5000 });
  });
});

// ============ ORDER HISTORY TESTS ============

test.describe('Order History', () => {
  test('/api/order-history POST vereist authenticatie', async ({ request }) => {
    const res = await request.post('/api/order-history', {
      data: { items: [{ id: 1, name: 'Test', price: 10, quantity: 1 }], total: 10 }
    });
    expect(res.status()).toBe(401);
  });

  test('/api/order-history GET vereist authenticatie', async ({ request }) => {
    const res = await request.get('/api/order-history');
    expect(res.status()).toBe(401);
  });

  test('order history wordt getoond na checkout', async ({ page }) => {
    await page.goto('/');
    // Inloggen
    await page.click('#login-btn');
    await page.fill('[data-testid="login-email"]', 'steven@example.com');
    await page.fill('[data-testid="login-password"]', 'welkom123');
    await page.click('[data-testid="login-submit"]');
    await expect(page.locator('#user-info')).toHaveText(/Steven/, { timeout: 5000 });

    // Product toevoegen — cart sidebar opent automatisch
    await page.locator('[data-testid="add-to-cart-1"]').click();
    await page.waitForTimeout(1000);

    // Wacht tot cart sidebar open is, en klik Afrekenen in de sidebar
    await expect(page.locator('#checkout-btn')).toBeVisible({ timeout: 5000 });
    await page.locator('#checkout-btn').click();
    await expect(page.locator('.checkout-success h2')).toHaveText('Bestelling geplaatst!', { timeout: 5000 });

    // Wacht op herstel van checkout knop
    await page.waitForTimeout(4000);

    // Open order history
    const historyBtn = page.locator('#order-history-btn');
    await expect(historyBtn).toBeVisible({ timeout: 5000 });
    await historyBtn.click();
    const historySection = page.locator('#order-history-section');
    await expect(historySection).toHaveClass(/show/);

    // Controler er een order is
    const orderItems = page.locator('#order-history-list .order-history-item');
    await expect(orderItems.first()).toBeVisible();
    await expect(orderItems.first().locator('.order-id')).toBeVisible();
    await expect(orderItems.first().locator('.order-total')).toBeVisible();
  });
});
