export function parseStrictArgs(argv, optionSpecs, defaults = {}) {
  const parsed = { ...defaults };
  const specsByFlag = new Map(optionSpecs.map((spec) => [spec.flag, spec]));
  const values = argv.slice(2);

  const readOptionValue = (index, flag) => {
    const next = values[index + 1];
    if (!next || next.startsWith("--")) {
      throw new Error(`missing value for ${flag}`);
    }
    return next;
  };

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--") {
      continue;
    }

    const equalsIndex = value.indexOf("=");
    const flag = equalsIndex === -1 ? value : value.slice(0, equalsIndex);
    const spec = specsByFlag.get(flag);
    if (!spec) {
      if (value.startsWith("--")) throw new Error(`unknown option ${flag}`);
      throw new Error(`unexpected argument ${value}`);
    }

    if (spec.type === "boolean") {
      if (equalsIndex !== -1) throw new Error(`unexpected value for ${flag}`);
      parsed[spec.name] = true;
      continue;
    }

    const optionValue = equalsIndex === -1 ? readOptionValue(index, flag) : value.slice(equalsIndex + 1);
    if (!optionValue) throw new Error(`missing value for ${flag}`);
    parsed[spec.name] = optionValue;
    if (equalsIndex === -1) index += 1;
  }

  return parsed;
}
