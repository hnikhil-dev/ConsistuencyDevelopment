// app/api/projects/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { calculateProjectScores } from '@/lib/scoring';
import { optimizePortfolio } from '@/lib/optimizer';

// GET Handler: Calculates real-time scores and runs portfolio optimizer
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse custom weights (format: weights=demand:0.2,population:0.15...)
    const customWeights = {};
    const weightsParam = searchParams.get('weights');
    if (weightsParam) {
      weightsParam.split(',').forEach(part => {
        const [key, val] = part.split(':');
        if (key && val) {
          customWeights[key] = parseFloat(val);
        }
      });
    }

    // Parse budget and scenario optimizer parameters
    const budgetLimit = parseInt(searchParams.get('budget') || '100000', 10);
    const scenario = searchParams.get('scenario') || 'max_benefit';

    // 1. Calculate Priority Scores for all active projects
    let allProjectsScored = await calculateProjectScores(customWeights);

    // Auto-seed projects 6-10 dynamically if missing (ensures 10-project portfolio simulation)
    if (allProjectsScored.length > 0 && allProjectsScored.length < 10) {
      try {
        const extraClusters = [
          { id: 6, category: 'sanitation', ward_id: 1, title: 'Ward 1 Public Sanitation Block', summary: 'Requests to build modern, hygienic public toilets in the commercial extension area.', citizen_count: 19, spam_count: 0, status: 'active' },
          { id: 7, category: 'water', ward_id: 3, title: 'Ward 3 Drinking Water Pipeline Extension', summary: 'Extension of clean drinking water mains to newly developed sub-localities in Wanowrie.', citizen_count: 11, spam_count: 0, status: 'active' },
          { id: 8, category: 'roads', ward_id: 2, title: 'Ward 2 Main Bypass Resurfacing', summary: 'Complete re-tarring of the heavy vehicle bypass road in Hadapsar Industrial Zone to prevent accident hazards.', citizen_count: 22, spam_count: 1, status: 'active' },
          { id: 9, category: 'sanitation', ward_id: 5, title: 'Ward 5 Drainage Network Upgrade', summary: 'Upgrading the storm water drainage channels in Mundhwa to prevent seasonal monsoon flooding.', citizen_count: 17, spam_count: 2, status: 'active' },
          { id: 10, category: 'skill', ward_id: 1, title: 'Ward 1 ITI Vocational Skill Center', summary: 'Establishment of an Industrial Training Institute extension to offer welder and fitter trade certifications.', citizen_count: 8, spam_count: 0, status: 'active' }
        ];

        const extraProjects = [
          { id: 6, cluster_id: 6, title: 'Public Sanitation Block Construction', category: 'sanitation', ward_id: 1, estimated_cost: 380000, status: 'Proposed' },
          { id: 7, cluster_id: 7, title: 'Drinking Water Pipeline Extension', category: 'water', ward_id: 3, estimated_cost: 550000, status: 'Proposed' },
          { id: 8, cluster_id: 8, title: 'Main Bypass Resurfacing Work', category: 'roads', ward_id: 2, estimated_cost: 920000, status: 'Proposed' },
          { id: 9, cluster_id: 9, title: 'Drainage Network Upgrade & Desilting', category: 'sanitation', ward_id: 5, estimated_cost: 480000, status: 'Proposed' },
          { id: 10, cluster_id: 10, title: 'ITI Vocational Skill Center Setup', category: 'skill', ward_id: 1, estimated_cost: 1200000, status: 'Proposed' }
        ];

        for (const clust of extraClusters) {
          await supabase.from('demand_clusters').upsert(clust, { onConflict: 'id' });
        }
        for (const proj of extraProjects) {
          await supabase.from('projects').upsert(proj, { onConflict: 'id' });
        }
        
        // Recalculate scores with the fresh seeds
        allProjectsScored = await calculateProjectScores(customWeights);
      } catch (e) {
        console.error("Auto-seeding projects 6-10 failed:", e);
      }
    }

    // 2. Correct old projects 1-5 costs in live database if they are scaled incorrectly (< 100,000)
    const hasOldCosts = allProjectsScored.some(p => p.estimated_cost < 100000);
    if (hasOldCosts) {
      try {
        const correctCosts = {
          1: 350000,
          2: 280000,
          3: 420000,
          4: 600000,
          5: 450000
        };

        for (const [id, cost] of Object.entries(correctCosts)) {
          await supabase
            .from('projects')
            .update({ estimated_cost: cost })
            .eq('id', parseInt(id, 10));
        }
        
        // Re-calculate scores with corrected costs
        allProjectsScored = await calculateProjectScores(customWeights);
      } catch (e) {
        console.error("Failed to correct old project costs in live database:", e);
      }
    }

    // 3. Solve Portfolio Allocation
    const portfolio = optimizePortfolio(allProjectsScored, budgetLimit, scenario);

    return NextResponse.json({
      success: true,
      allProjects: allProjectsScored,
      portfolio: {
        selected: portfolio.selected,
        deferred: portfolio.deferred,
        totalSpent: portfolio.totalSpent,
        remainingBudget: portfolio.remainingBudget,
        optimizedValue: portfolio.optimizedValue
      },
      weightsUsed: customWeights,
      scenarioUsed: scenario,
      budgetLimit
    });

  } catch (error) {
    console.error("GET Projects scoring error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST Handler: Handles MP approvals, status changes, and logs audit decision
export async function POST(request) {
  try {
    const body = await request.json();
    const { project_id, action, actor, previous_state, new_state, reason } = body;

    if (!project_id || !action || !new_state) {
      return NextResponse.json(
        { error: "Missing required properties: project_id, action, and new_state." },
        { status: 400 }
      );
    }

    // 1. Update project status in Supabase
    const { error: projErr } = await supabase
      .from('projects')
      .update({ status: new_state })
      .eq('id', project_id);

    if (projErr) {
      console.error("Error updating project status:", projErr);
      return NextResponse.json({ error: projErr.message }, { status: 500 });
    }

    // 2. Insert transaction into audit decision logs
    const { error: logErr } = await supabase
      .from('decision_logs')
      .insert({
        project_id,
        action,
        actor: actor || 'MP Office',
        previous_state: previous_state || 'Proposed',
        new_state,
        reason: reason || 'Approved through dashboard workspace'
      });

    if (logErr) {
      console.error("Error writing audit decision log:", logErr);
      // Don't fail the whole request if only the log fails, but warn
    }

    return NextResponse.json({
      success: true,
      message: `Project ${project_id} transitioned from ${previous_state} to ${new_state} successfully.`,
      logged: !logErr
    });

  } catch (error) {
    console.error("POST Projects decision log error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
