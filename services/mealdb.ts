const BASE_URL = 'https://www.themealdb.com/api/json/v1/1';

export const getAutocompleteSuggestions = async (query: string) => {
  try {
    const response = await fetch(`${BASE_URL}/list.php?i=list`);
    const data = await response.json();
    
    if (!data.meals) return [];

    const matches = data.meals
      .filter((m: any) => m.strIngredient.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 5) 
      .map((m: any) => ({ name: m.strIngredient.toLowerCase() }));

    return matches;
  } catch (error) {
    console.error("Autocomplete Error:", error);
    return [];
  }
};

export const getRecipesByIngredients = async (ingredients: string[]) => {
  try {
    if (ingredients.length === 0) return [];

    const mainIngredient = ingredients[0].replace(/ /g, '_');
    const response = await fetch(`${BASE_URL}/filter.php?i=${mainIngredient}`);
    const data = await response.json();

    if (!data.meals) return [];

    const topMeals = data.meals.slice(0, 10);

    const detailedMealsPromises = topMeals.map(async (meal: any) => {
      const detailRes = await fetch(`${BASE_URL}/lookup.php?i=${meal.idMeal}`);
      const detailData = await detailRes.json();
      const fullRecipe = detailData.meals[0];

      const recipeIngredients = [];
      for (let i = 1; i <= 20; i++) {
        const ing = fullRecipe[`strIngredient${i}`];
        if (ing && ing.trim() !== "") {
          recipeIngredients.push(ing.toLowerCase());
        }
      }

      const usedIngredients: any[] = [];
      const missedIngredients: any[] = [];

      recipeIngredients.forEach(ing => {
        if (ingredients.some(pantryItem => ing.includes(pantryItem) || pantryItem.includes(ing))) {
          usedIngredients.push({ name: ing });
        } else {
          missedIngredients.push({ name: ing });
        }
      });

      return {
        id: fullRecipe.idMeal,
        title: fullRecipe.strMeal,
        image: fullRecipe.strMealThumb,
        usedIngredientCount: usedIngredients.length,
        missedIngredientCount: missedIngredients.length,
        usedIngredients: usedIngredients,
        missedIngredients: missedIngredients,
        sourceUrl: fullRecipe.strYoutube || fullRecipe.strSource
      };
    });

    const fullyFormattedRecipes = await Promise.all(detailedMealsPromises);
    
    return fullyFormattedRecipes.sort((a, b) => b.usedIngredientCount - a.usedIngredientCount);

  } catch (error) {
    console.error("TheMealDB Engine Error:", error);
    throw error;
  }
};

export const getRecipeInformation = async (recipeId: string | number) => {
  try {
    const response = await fetch(`${BASE_URL}/lookup.php?i=${recipeId}`);
    const data = await response.json();
    
    if (!data.meals) return null;
    const recipe = data.meals[0];

    const extendedIngredients = [];
    for (let i = 1; i <= 20; i++) {
      const ing = recipe[`strIngredient${i}`];
      const measure = recipe[`strMeasure${i}`];
      if (ing && ing.trim() !== "") {
        extendedIngredients.push({ original: `${measure} ${ing}`.trim() });
      }
    }

    return {
      id: recipe.idMeal,
      title: recipe.strMeal,
      image: recipe.strMealThumb,
      extendedIngredients: extendedIngredients,
      instructions: recipe.strInstructions, 
      sourceUrl: recipe.strYoutube || recipe.strSource
    };
  } catch (error) {
    console.error("Recipe Details Error:", error);
    return null;
  }
};