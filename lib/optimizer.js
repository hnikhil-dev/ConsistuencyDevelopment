// lib/optimizer.js

/**
 * Solves the 0-1 Knapsack problem using Dynamic Programming.
 * Items: Array of { id, cost, value }
 * Capacity: Budget limit (integer)
 */
function solveKnapsack(items, capacity) {
  const n = items.length;
  const dp = Array(n + 1).fill(0).map(() => Array(capacity + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    const item = items[i - 1];
    for (let w = 0; w <= capacity; w++) {
      if (item.cost <= w) {
        dp[i][w] = Math.max(
          item.value + dp[i - 1][w - item.cost],
          dp[i - 1][w]
        );
      } else {
        dp[i][w] = dp[i - 1][w];
      }
    }
  }

  // Backtrack to find selected items
  let w = capacity;
  const selectedIndices = [];
  for (let i = n; i > 0; i--) {
    if (dp[i][w] !== dp[i - 1][w]) {
      selectedIndices.push(i - 1);
      w -= items[i - 1].cost;
    }
  }

  return {
    indices: selectedIndices,
    totalValue: dp[n][capacity]
  };
}

/**
 * Optimizes the project portfolio based on a budget limit and planning philosophy.
 * Projects: List of scored projects from lib/scoring.js
 * BudgetLimit: Max budget (e.g. 100,000)
 * Scenario: 'max_benefit' | 'max_citizens' | 'max_equity' | 'max_urgency'
 */
export function optimizePortfolio(projects, budgetLimit, scenario = 'max_benefit') {
  if (!projects || projects.length === 0) {
    return { selected: [], deferred: [], totalSpent: 0, remainingBudget: budgetLimit };
  }

  // Scale costs to keep DP complexity low (e.g. ₹3,50,000 -> 35 units)
  const scale = 10000;
  const capacity = Math.floor(budgetLimit / scale);

  const knapsackItems = projects.map((proj, index) => {
    const costScaled = Math.max(1, Math.round(proj.estimated_cost / scale));
    let value = 0;

    switch (scenario) {
      case 'max_benefit':
        value = Math.round(proj.total_score); // Maximize Priority Score
        break;
      case 'max_citizens':
        // Maximize raw unique citizen count benefited
        value = Math.round(proj.citizen_count || 1); 
        break;
      case 'max_equity':
        // Maximize equity deficit (funding to poorest/highest-score wards first)
        value = Math.round((proj.sub_scores?.equity || 1.0) * 10);
        break;
      case 'max_urgency':
        // Maximize immediate category urgency
        value = Math.round((proj.sub_scores?.urgency || 1.0) * 10);
        break;
      default:
        value = Math.round(proj.total_score);
    }

    return {
      index,
      cost: costScaled,
      value: Math.max(1, value), // Ensure positive value
      actualCost: proj.estimated_cost
    };
  });

  // 2. Solve Knapsack
  const result = solveKnapsack(knapsackItems, capacity);
  
  const selectedIndices = new Set(result.indices);
  const selected = [];
  const deferred = [];
  let totalSpent = 0;

  projects.forEach((proj, idx) => {
    if (selectedIndices.has(idx)) {
      selected.push(proj);
      totalSpent += proj.estimated_cost;
    } else {
      deferred.push(proj);
    }
  });

  return {
    selected,
    deferred,
    totalSpent,
    remainingBudget: budgetLimit - totalSpent,
    optimizedValue: result.totalValue
  };
}
