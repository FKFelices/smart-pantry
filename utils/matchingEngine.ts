export const checkIngredientMatch = (
  pantryItems: { name: string }[], 
  recipeIngredient: string
): boolean => {
  if (!recipeIngredient) return false;

  // Standardize the API ingredient (lowercase, remove extra spaces)
  const target = recipeIngredient.toLowerCase().trim();

  // Loop through everything in the user's pantry
  return pantryItems.some(pantryItem => {
    const has = pantryItem.name.toLowerCase().trim();

    // 1. Exact Match ("chicken" === "chicken")
    if (target === has) return true;

    // 2. Substring Match A ("garlic" is inside "garlic clove")
    if (target.includes(has)) return true;

    // 3. Substring Match B ("chicken" is inside "chicken breast")
    if (has.includes(target)) return true;

    // 4. Plural handling ("tomato" vs "tomatoes", "egg" vs "eggs")
    if (
      target === has + 's' || 
      target === has + 'es' || 
      has === target + 's' || 
      has === target + 'es'
    ) {
      return true;
    }

    return false;
  });
};