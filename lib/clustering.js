// lib/clustering.js
import { supabase } from './supabase';

/**
 * Tokenizes text and returns a set of lowercase words.
 */
function getWordTokens(text) {
  if (!text) return new Set();
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2)
  );
}

/**
 * Computes Jaccard Similarity between two texts (Intersection / Union).
 * Robust for keyword overlapping semantic matching.
 */
export function calculateJaccardSimilarity(text1, text2) {
  const words1 = getWordTokens(text1);
  const words2 = getWordTokens(text2);
  
  if (words1.size === 0 || words2.size === 0) return 0;
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

/**
 * Main Clustering and Spam Detection Engine
 * Receives:
 *  - submission: { id, user_name, raw_text, audio_url, image_url, channel, gps_lat, gps_lng }
 *  - parsed: { category, issue_details, ward_id, confidence_score, trust_score, status }
 */
export async function clusterSubmission(submission, parsed) {
  const { category, ward_id, issue_details } = parsed;

  // 1. Fetch active clusters for the same category and ward to check for matches
  const { data: clusters, error: clusterErr } = await supabase
    .from('demand_clusters')
    .select('*')
    .eq('category', category)
    .eq('ward_id', ward_id || 0)
    .eq('status', 'active');

  if (clusterErr) {
    console.error("Error fetching clusters for matching:", clusterErr);
  }

  let matchedCluster = null;
  let isCampaign = false;

  if (clusters && clusters.length > 0) {
    // 2. Run similarity match against existing clusters
    for (const cluster of clusters) {
      // Calculate similarity between the new issue details and the cluster summary/title
      const titleSim = calculateJaccardSimilarity(issue_details, cluster.title);
      const summarySim = calculateJaccardSimilarity(issue_details, cluster.summary);
      const maxSim = Math.max(titleSim, summarySim);

      // Threshold: 0.35 represents a strong semantic topic overlap
      if (maxSim >= 0.35) {
        matchedCluster = cluster;
        
        // Check for campaign coordination (extremely high near-duplicate similarity > 0.80)
        if (maxSim >= 0.80) {
          isCampaign = true;
        }
        break;
      }
    }
  }

  // 3. Save the submission issue mapping and update metrics
  parsed.is_campaign = isCampaign;
  
  // Insert extracted issue
  const { error: issueErr } = await supabase
    .from('extracted_issues')
    .insert({
      submission_id: submission.id,
      category: parsed.category,
      issue_details: parsed.issue_details,
      ward_id: parsed.ward_id,
      confidence_score: parsed.confidence_score,
      status: parsed.status,
      trust_score: parsed.trust_score,
      is_campaign: isCampaign
    });

  if (issueErr) {
    console.error("Error inserting extracted issue:", issueErr);
  }

  if (matchedCluster) {
    // 4. Update existing cluster counts
    const updatedCount = isCampaign ? matchedCluster.citizen_count : matchedCluster.citizen_count + 1;
    const updatedSpam = isCampaign ? matchedCluster.spam_count + 1 : matchedCluster.spam_count;

    await supabase
      .from('demand_clusters')
      .update({
        citizen_count: updatedCount,
        spam_count: updatedSpam
      })
      .eq('id', matchedCluster.id);

    // Save cluster mapping
    await supabase
      .from('cluster_mappings')
      .insert({
        submission_id: submission.id,
        cluster_id: matchedCluster.id
      });

    return {
      clusterId: matchedCluster.id,
      action: "merged",
      isCampaign,
      clusterTitle: matchedCluster.title
    };
  } else {
    // 5. Create a new demand cluster
    const clusterTitle = `Ward ${ward_id || 'Pool'} ${category.toUpperCase()} Needs`;
    const clusterSummary = `Citizen requests regarding ${category} issues in Ward ${ward_id || 'Pool'}. Specifically: "${issue_details}"`;

    const { data: newCluster, error: newClusterErr } = await supabase
      .from('demand_clusters')
      .insert({
        category,
        ward_id,
        title: clusterTitle,
        summary: clusterSummary,
        citizen_count: 1,
        spam_count: 0,
        status: 'active'
      });

    if (newClusterErr) {
      console.error("Error creating new cluster:", newClusterErr);
      return { error: newClusterErr.message };
    }

    // Fetch the newly created cluster to map it (since insert returns the created rows)
    const { data: createdClusters } = await supabase
      .from('demand_clusters')
      .select('*')
      .eq('category', category)
      .eq('ward_id', ward_id || 0)
      .order('id', { ascending: false })
      .limit(1);

    const createdCluster = createdClusters && createdClusters[0];

    if (createdCluster) {
      // Save cluster mapping
      await supabase
        .from('cluster_mappings')
        .insert({
          submission_id: submission.id,
          cluster_id: createdCluster.id
        });

      // 6. Create a corresponding proposed project for the MP dashboard
      const estimatedCost = getCategoryDefaultCost(category);
      await supabase
        .from('projects')
        .insert({
          cluster_id: createdCluster.id,
          title: clusterTitle,
          category,
          ward_id: ward_id || 1, // default to ward 1 if unassigned
          estimated_cost: estimatedCost,
          status: 'Proposed'
        });

      return {
        clusterId: createdCluster.id,
        action: "created",
        isCampaign: false,
        clusterTitle
      };
    }
    
    return { error: "Failed to map new cluster" };
  }
}

// Estimates a standard cost band per project category for the portfolio optimizer in Rupees (INR)
function getCategoryDefaultCost(category) {
  switch (category) {
    case 'education': return 420000; // Rs. 4.2 Lakhs
    case 'roads': return 280000;     // Rs. 2.8 Lakhs
    case 'water': return 350000;     // Rs. 3.5 Lakhs
    case 'health': return 600000;    // Rs. 6.0 Lakhs
    case 'sanitation': return 150000;// Rs. 1.5 Lakhs
    case 'skill': return 450000;     // Rs. 4.5 Lakhs
    default: return 250000;          // Rs. 2.5 Lakhs
  }
}
