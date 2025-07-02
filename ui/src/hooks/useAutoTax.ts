import { Category, Transaction } from "@/types";

import { sigCategories, sigUserInfo } from "@/store";
import { createLineItem } from "@/utils/forms";

const TAX_GUESS_REGEX = /tax|vat|gst|hst/i;

const guessTaxCategory = (categories: Category[]): Category => {
  const sorted = categories
    .map(({ id, name }) => ({
      id,
      name,
      // Regex test positive + shorter name = highest score
      score: (TAX_GUESS_REGEX.test(name) ? 1 : 0) + 1 / name.length,
    }))
    .sort((a, b) => b.score - a.score);
  const [bestGuess] = sorted;
  return categories.filter(({ id }) => id === bestGuess.id)[0];
};

const useAutoTax = () => {
  const applyAutoTax = (t: Transaction) => {
    if (t.line_items.length === 1 && sigCategories.value.length > 1) {
      const taxRate = sigUserInfo.value?.config.tax_rate || 0;

      if (taxRate) {
        const [firstLineItem] = t.line_items;
        const secondLineItem = createLineItem(t);
        const newLineStr = (firstLineItem.amount / (1 + taxRate)).toFixed(2);
        const newLineAmount = Number.parseFloat(newLineStr);

        secondLineItem.name = "Tax";
        secondLineItem.category_id = guessTaxCategory(sigCategories.value).id;
        secondLineItem.amount = Number.parseFloat((firstLineItem.amount - newLineAmount).toFixed(2));
        secondLineItem.amount_input = secondLineItem.amount.toString();

        firstLineItem.amount_input = newLineStr;
        firstLineItem.amount = newLineAmount;

        t.line_items.push(secondLineItem);
      }
    }
  };

  return { applyAutoTax };
};

export default useAutoTax;
