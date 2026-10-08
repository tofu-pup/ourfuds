import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const recipes = JSON.parse(readFileSync(new URL('../recipes.json', import.meta.url), 'utf8')).recipes;
const source = html.slice(html.indexOf('    function parseQuantity('), html.indexOf('    function renderRecipe('));
assert.ok(source.includes('function scaleMetricEquivalent('));

function label(ingredient, scale) {
  const context = vm.createContext({ scale });
  vm.runInContext(source, context);
  return context.ingredientLabel(ingredient);
}

test('lentil soup scales both cup quantities and metric equivalents', () => {
  const soup = recipes.find(recipe => recipe.id === 'glowing-spiced-lentil-soup');
  const onion = soup.ingredients.find(ingredient => ingredient.item === 'diced onion');
  const lentils = soup.ingredients.find(ingredient => ingredient.item === 'uncooked red lentils, rinsed');
  const broth = soup.ingredients.find(ingredient => ingredient.item === 'low-sodium vegetable broth');
  assert.equal(label(onion, .5), '1 cups (140g) diced onion');
  assert.equal(label(onion, 1.5), '3 cups (420g) diced onion');
  assert.equal(label(onion, 2), '4 cups (560g) diced onion');
  assert.equal(label(lentils, .5), '3/8 cup (70g) uncooked red lentils, rinsed');
  assert.equal(label(broth, .5), '1 3/4 cups (437.5mL) low-sodium vegetable broth');
  assert.equal(label(broth, 2), '7 cups (1750mL) low-sodium vegetable broth');
});

test('all authored labels remain unchanged at the default size', () => {
  for (const recipe of recipes) {
    for (const ingredient of recipe.ingredients) {
      assert.equal(label(ingredient, 1),
        [ingredient.quantity, ingredient.unit, ingredient.item].filter(part => part !== '').join(' '));
    }
  }
});

test('package capacities and per-item weights remain unchanged', () => {
  for (const unit of ['14oz/398mL can', '5oz/140g package', 'block (350g)', 'large (about 400g)']) {
    assert.equal(label({ quantity: 1, unit, item: 'ingredient' }, 2), `2 ${unit} ingredient`);
  }
});

test('metric equivalents support spacing, case, approximations and decimal results', () => {
  assert.equal(label({ quantity: 8, unit: 'oz (about 227g)', item: 'tempeh' }, .5),
    '4 oz (about 113.5g) tempeh');
  assert.equal(label({ quantity: 1, unit: 'cup (60 mL)', item: 'wine' }, 2),
    '2 cup (120 mL) wine');
  assert.equal(label({ quantity: 1, unit: 'tbsp (0.01 kg)', item: 'ingredient' }, 2),
    '2 tbsp (0.02 kg) ingredient');
  assert.equal(label({ quantity: 1, unit: 'heaping cup (20g)', item: 'basil' }, .5),
    '1/2 heaping cup (10g) basil');
});

test('fractions, ranges and direct metric quantities scale without touching item descriptions', () => {
  assert.equal(label({ quantity: '1/2', unit: 'tsp', item: 'salt' }, .5), '1/4 tsp salt');
  assert.equal(label({ quantity: '0.5-1', unit: 'tsp', item: 'mustard' }, 2), '1–2 tsp mustard');
  assert.equal(label({ quantity: '1-2', unit: 'cups (140g)', item: 'ingredient' }, .5),
    '1/2–1 cups (70g) ingredient');
  assert.equal(label({ quantity: 40, unit: 'g', item: 'almonds' }, .5), '20 g almonds');
  assert.equal(label({ quantity: 1, unit: 'cup', item: 'milk from a 500ml carton' }, 2),
    '2 cup milk from a 500ml carton');
});

test('descriptive and unmeasured quantities do not scale', () => {
  for (const quantity of ['pinch', '', 'optional', 'to taste']) {
    const ingredient = { quantity, unit: 'cup (100g)', item: 'ingredient' };
    assert.equal(label(ingredient, 2), label(ingredient, 1));
  }
});

test('half-size choice is available and reopening resets to 1x', () => {
  assert.ok(html.includes('for (const factor of [0.5, 1, 1.5, 2])'));
  const context = vm.createContext({
    scale: .5, servings: 2, checked: new Set([0]), usageCounted: true,
    leaveCooking() {}, renderRecipe() {}, window: { scrollTo() {} }
  });
  const openRecipe = html.slice(html.indexOf('    function openRecipe('), html.indexOf('    function parseQuantity('));
  vm.runInContext(openRecipe, context);
  context.openRecipe({ servings: 4 });
  assert.equal(context.scale, 1);
  assert.equal(context.servings, 4);
  assert.equal(context.checked.size, 0);
  context.openRecipe({ servings: null });
  assert.equal(context.scale, 1);
  assert.equal(context.servings, null);
});
