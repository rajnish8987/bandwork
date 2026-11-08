// Loads are always stored in kg, and shown in the person's chosen unit.

const KG_PER_LB = 0.45359237;

const tidy = (n, places) => Number(n.toFixed(places));

export function toUnit(kg, unit) {
  return unit === 'lb' ? tidy(kg / KG_PER_LB, 1) : tidy(kg, 2);
}

export function fromUnit(value, unit) {
  return unit === 'lb' ? tidy(value * KG_PER_LB, 2) : value;
}

export function formatLoad(kg, unit) {
  return unit === 'lb' ? `${toUnit(kg, 'lb')} lb` : `${toUnit(kg, 'kg')} kg`;
}
