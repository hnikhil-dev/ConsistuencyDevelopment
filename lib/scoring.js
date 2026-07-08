// lib/scoring.js
import { supabase } from './supabase';
import { getCachedData } from './cache';

// Default policy weights (total 100%)
export const DEFAULT_WEIGHTS = {
  demand: 0.20,
  population: 0.15,
  gap: 0.15,
  equity: 0.15,
  urgency: 0.15,
  feasibility: 0.10,
  alignment: 0.05,
  trust: 0.05
};

// Fixed Urgency scale per category
const CATEGORY_URGENCY = {
  water: 10.0,
  health: 9.5,
  sanitation: 8.5,
  roads: 8.0,
  education: 7.0,
  skill: 5.0
};

/**
 * Computes all 8-dimensional scores for all active projects
 * Accepts: customWeights: { demand, population, gap, equity, urgency, feasibility, alignment, trust }
 */
export async function calculateProjectScores(customWeights = {}) {
  const weights = { ...DEFAULT_WEIGHTS, ...customWeights };

  // 1. Fetch active projects (not cached, requires real-time status updates)
  const { data: projects, error: pErr } = await supabase.from('projects').select('*');

  if (pErr) {
    console.error("Error fetching projects for scoring:", pErr);
    return [];
  }

  // 2. Fetch public datasets using TTL Cache to bypass slow Supabase network roundtrips
  const wards = await getCachedData('wards_cache', async () => {
    const { data } = await supabase.from('wards').select('*');
    return data || [];
  }, 30000); // 30s cache

  const clusters = await getCachedData('clusters_cache', async () => {
    const { data } = await supabase.from('demand_clusters').select('*');
    return data || [];
  }, 5000); // 5s cache for live citizen inputs

  const eduInd = await getCachedData('edu_ind_cache', async () => {
    const { data } = await supabase.from('education_indicators').select('*');
    return data || [];
  }, 60000); // 60s static cache

  const roadInd = await getCachedData('road_ind_cache', async () => {
    const { data } = await supabase.from('road_indicators').select('*');
    return data || [];
  }, 60000);

  const waterInd = await getCachedData('water_ind_cache', async () => {
    const { data } = await supabase.from('water_indicators').select('*');
    return data || [];
  }, 60000);

  const healthInd = await getCachedData('health_ind_cache', async () => {
    const { data } = await supabase.from('health_indicators').select('*');
    return data || [];
  }, 60000);

  const issues = await getCachedData('issues_cache', async () => {
    const { data } = await supabase.from('extracted_issues').select('*');
    return data || [];
  }, 5000); // 5s cache

  // Create lookups for swift joining
  const wardMap = Object.fromEntries(wards.map(w => [w.id, w]));
  const clusterMap = Object.fromEntries(clusters.map(c => [c.id, c]));
  
  const eduMap = Object.fromEntries(eduInd?.map(e => [e.ward_id, e]) || []);
  const roadMap = Object.fromEntries(roadInd?.map(r => [r.ward_id, r]) || []);
  const waterMap = Object.fromEntries(waterInd?.map(w => [w.ward_id, w]) || []);
  const healthMap = Object.fromEntries(healthInd?.map(h => [h.ward_id, h]) || []);

  const maxPopulation = wards && wards.length 
    ? Math.max(...wards.map(w => w.population)) 
    : 120000;

  const scoredProjects = [];

  for (const project of projects) {
    const cluster = clusterMap[project.cluster_id] || { citizen_count: 0, spam_count: 0 };
    const ward = wardMap[project.ward_id] || { population: 50000, equity_score: 5.0 };

    // 1. Demand Score: Logarithmic scaling based on unique citizen count + dampened spam count
    const uniqueCount = cluster.citizen_count || 0;
    const spamCount = cluster.spam_count || 0;
    const effectiveDemand = uniqueCount + (spamCount * 0.10);
    // Score scales up to 10 for 50 citizens
    const demandScore = Math.min(10.0, Math.log2(effectiveDemand + 1) * 1.8);

    // 2. Population Density Score: Normalizes dynamically using highest population ward in the dataset
    const populationScore = Math.min(10.0, (ward.population / maxPopulation) * 10.0);

    // 3. Infrastructure Gap Score: Computes severity index based on category indicators
    let gapScore = 5.0; // Default
    let gapDescription = "";
    
    switch (project.category) {
      case 'education': {
        const ind = eduMap[project.ward_id] || { school_capacity_ratio: 1.0, avg_school_distance: 2.0 };
        // Overcrowding ratio (ratio > 1.0 increases gap) + distance factor
        const capacityFactor = Math.max(0, (ind.school_capacity_ratio - 0.70) * 10);
        const distanceFactor = ind.avg_school_distance * 1.5;
        gapScore = Math.min(10.0, (capacityFactor + distanceFactor) / 2);
        gapDescription = `Ward school capacity is at ${(ind.school_capacity_ratio * 100).toFixed(0)}% capacity; closest alternative is ${ind.avg_school_distance.toFixed(1)} km away.`;
        break;
      }
      case 'roads': {
        const ind = roadMap[project.ward_id] || { road_quality_index: 6.0, public_transit_dist: 1.5 };
        // Lower road index means higher gap (10 - quality) + public transport distance
        const qualityFactor = 10.0 - ind.road_quality_index;
        const transitFactor = ind.public_transit_dist * 2;
        gapScore = Math.min(10.0, (qualityFactor + transitFactor) / 2);
        gapDescription = `Local roads rated ${ind.road_quality_index.toFixed(1)}/10; transit connectivity distance is ${ind.public_transit_dist.toFixed(1)} km.`;
        break;
      }
      case 'water': {
        const ind = waterMap[project.ward_id] || { water_scarcity_index: 5.0, supply_hours_daily: 4.0 };
        // Higher water scarcity + lower daily supply hours increases gap
        const scarcityFactor = ind.water_scarcity_index;
        const supplyFactor = Math.max(0, 10.0 - (ind.supply_hours_daily * 0.41));
        gapScore = Math.min(10.0, (scarcityFactor + supplyFactor) / 2);
        gapDescription = `Ward water scarcity score is ${ind.water_scarcity_index.toFixed(1)}/10; daily supply restricted to ${ind.supply_hours_daily.toFixed(1)} hours.`;
        break;
      }
      case 'health': {
        const ind = healthMap[project.ward_id] || { health_center_distance: 3.0, beds_per_thousand: 2.0 };
        const distanceFactor = ind.health_center_distance * 1.5;
        const bedsFactor = Math.max(0, 10.0 - (ind.beds_per_thousand * 2));
        gapScore = Math.min(10.0, (distanceFactor + bedsFactor) / 2);
        gapDescription = `Nearest health sub-center is ${ind.health_center_distance.toFixed(1)} km away with only ${ind.beds_per_thousand.toFixed(1)} beds/1,000 citizens.`;
        break;
      }
      case 'sanitation': {
        const ind = waterMap[project.ward_id] || { water_scarcity_index: 5.0 };
        gapScore = Math.min(10.0, ind.water_scarcity_index * 1.1); // Correlation with water infrastructure
        gapDescription = `Sanitation risk linked to high water scarcity index of ${ind.water_scarcity_index.toFixed(1)}/10.`;
        break;
      }
      case 'skill': {
        const ind = roadMap[project.ward_id] || { road_quality_index: 5.0 };
        gapScore = Math.min(10.0, 10.0 - ind.road_quality_index); // Correlation with industrial proximity/quality
        gapDescription = `Youth employment gap matched with local industrial zone availability indicators.`;
        break;
      }
    }

    // 4. Equity Need: Mapped directly to the ward's equity/income deficit index
    const equityScore = ward.equity_score;

    // 5. Urgency Score: Static category urgency mapping
    const urgencyScore = CATEGORY_URGENCY[project.category] || 6.0;

    // 6. Feasibility Score: Lower cost yields higher feasibility
    const feasibilityScore = Math.max(1.0, Math.min(10.0, 10.0 - (project.estimated_cost / 10000)));

    // 7. Strategic Alignment Score: Pre-defined planning alignments
    let alignmentScore = 6.0; // Default
    if (project.category === 'water' && project.ward_id === 4) alignmentScore = 9.0; // Ward 4 Water pipeline priority
    if (project.category === 'roads' && project.ward_id === 5) alignmentScore = 8.5; // Ward 5 Road repair priority
    if (project.category === 'education' && project.ward_id === 3) alignmentScore = 8.0;

    // 8. Trust / Evidence Quality Score: Average trust score of submissions in the cluster
    const clusterIssues = issues?.filter(iss => {
      // Find matches in cluster_mappings
      return clusterMap[project.cluster_id] ? iss.ward_id === project.ward_id && iss.category === project.category : false;
    }) || [];
    const avgTrust = clusterIssues.length 
      ? clusterIssues.reduce((sum, item) => sum + item.trust_score, 0) / clusterIssues.length
      : 8.0; // default to high if seeded

    const trustScore = Math.min(10.0, avgTrust);

    // Calculate Total Priority Score (0-100 scale)
    const rawPriority = (demandScore * weights.demand) +
                        (populationScore * weights.population) +
                        (gapScore * weights.gap) +
                        (equityScore * weights.equity) +
                        (urgencyScore * weights.urgency) +
                        (feasibilityScore * weights.feasibility) +
                        (alignmentScore * weights.alignment) +
                        (trustScore * weights.trust);
                        
    const totalScore = Math.round(rawPriority * 10); // scale 0-10 to 0-100

    // Construct detailed explainability reasons
    const explainReasons = [];
    if (effectiveDemand >= 20) {
      explainReasons.push(`Backed by high citizen demand intensity (${effectiveDemand.toFixed(0)} requests, with ${spamCount} flagged campaign entries minimized).`);
    } else {
      explainReasons.push(`Supported by ${uniqueCount} unique citizen requests.`);
    }
    explainReasons.push(gapDescription || `Addresses a critical infrastructure deficit in the ${project.category} sector.`);
    if (ward.equity_score >= 7.0) {
      explainReasons.push(`Located in ${ward.name}, which is classified as highly underserved (Equity Deficit: ${ward.equity_score}/10).`);
    }
    if (urgencyScore >= 9.0) {
      explainReasons.push(`Category Urgency rated high due to safety/health risks associated with ${project.category}.`);
    }

    scoredProjects.push({
      ...project,
      ward_name: ward.name,
      citizen_count: uniqueCount,
      sub_scores: {
        demand: Math.round(demandScore * 10) / 10,
        population: Math.round(populationScore * 10) / 10,
        gap: Math.round(gapScore * 10) / 10,
        equity: Math.round(equityScore * 10) / 10,
        urgency: Math.round(urgencyScore * 10) / 10,
        feasibility: Math.round(feasibilityScore * 10) / 10,
        alignment: Math.round(alignmentScore * 10) / 10,
        trust: Math.round(trustScore * 10) / 10
      },
      total_score: totalScore,
      evidence_reasons: explainReasons
    });
  }

  // Sort descending by total score
  return scoredProjects.sort((a, b) => b.total_score - a.total_score);
}
