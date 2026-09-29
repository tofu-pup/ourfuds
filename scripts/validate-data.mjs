import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));
const schema = read('schema/recipes.schema.json');
const errors = [];

function validate(value, rule, path) {
  if (rule.$ref) {
    const target = rule.$ref.split('/').slice(1).reduce((part, key) => part[key], schema);
    validate(value, target, path);
    return;
  }
  if (rule.anyOf) {
    if (!rule.anyOf.some((branch) => {
      const before = errors.length;
      validate(value, branch, path);
      const valid = errors.length === before;
      errors.length = before;
      return valid;
    })) errors.push(`${path}: does not match any allowed type`);
    return;
  }
  const type = Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value;
  const validType = rule.type === 'integer' ? type === 'number' && Number.isInteger(value)
    : rule.type === 'number' ? type === 'number' && Number.isFinite(value)
      : type === rule.type;
  if (!validType) {
    errors.push(`${path}: expected ${rule.type}`);
    return;
  }
  if (rule.minimum !== undefined && value < rule.minimum) errors.push(`${path}: must be >= ${rule.minimum}`);
  if (rule.minLength !== undefined && value.trim().length < rule.minLength) errors.push(`${path}: cannot be empty`);
  if (rule.pattern && !new RegExp(rule.pattern).test(value)) errors.push(`${path}: invalid format`);
  if (rule.minItems !== undefined && value.length < rule.minItems) errors.push(`${path}: needs at least ${rule.minItems} item(s)`);
  if (rule.uniqueItems && new Set(value.map((item) => JSON.stringify(item))).size !== value.length) errors.push(`${path}: duplicate items`);
  if (rule.items) value.forEach((item, index) => validate(item, rule.items, `${path}[${index}]`));
  if (rule.properties) {
    for (const key of rule.required ?? []) {
      if (!Object.hasOwn(value, key)) errors.push(`${path}.${key}: required`);
    }
    for (const [key, item] of Object.entries(value)) {
      if (Object.hasOwn(rule.properties, key)) validate(item, rule.properties[key], `${path}.${key}`);
      else if (rule.additionalProperties === false) errors.push(`${path}.${key}: unexpected property`);
    }
  }
}

try {
  const data = read('recipes.json');
  validate(data, schema, 'recipes.json');
  if (Array.isArray(data.categories) && Array.isArray(data.recipes)) {
    const ids = new Set();
    data.recipes.forEach((recipe, index) => {
      if (ids.has(recipe.id)) errors.push(`recipes[${index}].id: duplicate ID`);
      ids.add(recipe.id);
      if (!data.categories.includes(recipe.category)) errors.push(`recipes[${index}].category: missing from categories`);
      if (recipe.image) {
        if (!existsSync(join(root, recipe.image))) errors.push(`recipes[${index}].image: file not found`);
        if (!recipe.imageAlt?.trim()) errors.push(`recipes[${index}].imageAlt: required for a photo`);
        if (!recipe.imageCaption?.trim()) errors.push(`recipes[${index}].imageCaption: required for a photo`);
      }
    });
    const usage = read('usage.json');
    if (usage === null || Array.isArray(usage) || typeof usage !== 'object') {
      errors.push('usage.json: expected an object mapping recipe IDs to counts');
    } else {
      for (const [id, count] of Object.entries(usage)) {
        if (!ids.has(id)) errors.push(`usage.json.${id}: unknown recipe ID`);
        if (!Number.isSafeInteger(count) || count < 0) errors.push(`usage.json.${id}: expected a non-negative safe integer`);
      }
    }
  }
} catch (error) {
  errors.push(`Could not read or parse data: ${error.message}`);
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('recipes.json and usage.json valid');
}
