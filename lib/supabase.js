import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Check if keys are active and valid
const isConfigured = supabaseUrl && 
                     supabaseAnonKey && 
                     supabaseUrl !== 'https://placeholder-url.supabase.co' &&
                     supabaseUrl.startsWith('https://');

// Local storage key for mock db
const MOCK_DB_KEY = 'peoples_priorities_mock_db';

// Initial Seed Data for the Mock Database
const INITIAL_MOCK_DATA = {
  wards: [
    { id: 1, name: 'Ward 1 - Koregaon Park Extension', population: 45000, equity_score: 2.5 },
    { id: 2, name: 'Ward 2 - Hadapsar Industrial Zone', population: 78000, equity_score: 5.0 },
    { id: 3, name: 'Ward 3 - Wanowrie Central', population: 92000, equity_score: 6.5 },
    { id: 4, name: 'Ward 4 - Kondhwa Khurd', population: 115000, equity_score: 8.5 },
    { id: 5, name: 'Ward 5 - Mundhwa Junction', population: 68000, equity_score: 7.0 }
  ],
  education_indicators: [
    { ward_id: 1, school_capacity_ratio: 0.75, avg_school_distance: 1.2 },
    { ward_id: 2, school_capacity_ratio: 0.95, avg_school_distance: 2.8 },
    { ward_id: 3, school_capacity_ratio: 1.35, avg_school_distance: 4.8 },
    { ward_id: 4, school_capacity_ratio: 1.10, avg_school_distance: 3.5 },
    { ward_id: 5, school_capacity_ratio: 0.85, avg_school_distance: 2.2 }
  ],
  road_indicators: [
    { ward_id: 1, road_quality_index: 8.5, public_transit_dist: 0.5 },
    { ward_id: 2, road_quality_index: 6.0, public_transit_dist: 1.5 },
    { ward_id: 3, road_quality_index: 5.2, public_transit_dist: 1.8 },
    { ward_id: 4, road_quality_index: 4.0, public_transit_dist: 2.5 },
    { ward_id: 5, road_quality_index: 2.8, public_transit_dist: 3.2 }
  ],
  water_indicators: [
    { ward_id: 1, water_scarcity_index: 1.5, supply_hours_daily: 24.0 },
    { ward_id: 2, water_scarcity_index: 4.5, supply_hours_daily: 6.0 },
    { ward_id: 3, water_scarcity_index: 5.0, supply_hours_daily: 4.0 },
    { ward_id: 4, water_scarcity_index: 8.8, supply_hours_daily: 1.2 },
    { ward_id: 5, water_scarcity_index: 6.5, supply_hours_daily: 3.0 }
  ],
  health_indicators: [
    { ward_id: 1, health_center_distance: 0.8, beds_per_thousand: 4.5 },
    { ward_id: 2, health_center_distance: 2.5, beds_per_thousand: 2.1 },
    { ward_id: 3, health_center_distance: 3.2, beds_per_thousand: 1.8 },
    { ward_id: 4, health_center_distance: 5.5, beds_per_thousand: 0.8 },
    { ward_id: 5, health_center_distance: 4.0, beds_per_thousand: 1.2 }
  ],
  submissions: [
    {
      id: 'sub-init-1',
      user_name: 'Amit Sharma',
      raw_text: 'Ward 4 leaks everywhere, water supply is highly polluted and only comes for 1 hour.',
      audio_url: null,
      image_url: null,
      language: 'English',
      channel: 'Web Form',
      gps_lat: 18.484,
      gps_lng: 73.894,
      created_at: new Date(Date.now() - 3600000 * 24).toISOString()
    },
    {
      id: 'sub-init-2',
      user_name: 'Ramesh Kale',
      raw_text: 'Mundhwa road holds lots of potholes near the signal. Road is completely broken.',
      audio_url: null,
      image_url: null,
      language: 'English',
      channel: 'Web Form',
      gps_lat: 18.530,
      gps_lng: 73.918,
      created_at: new Date(Date.now() - 3600000 * 12).toISOString()
    }
  ],
  extracted_issues: [
    {
      id: 1,
      submission_id: 'sub-init-1',
      category: 'water',
      issue_details: 'Contaminated water supply and low pressure',
      ward_id: 4,
      confidence_score: 0.95,
      status: 'verified',
      trust_score: 3.5,
      is_campaign: false
    },
    {
      id: 2,
      submission_id: 'sub-init-2',
      category: 'roads',
      issue_details: 'Massive potholes near signal',
      ward_id: 5,
      confidence_score: 0.92,
      status: 'verified',
      trust_score: 3.5,
      is_campaign: false
    }
  ],
  demand_clusters: [
    {
      id: 1,
      category: 'water',
      ward_id: 4,
      title: 'Ward 4 Clean Water Pipeline Upgrade',
      summary: 'Consolidated demand for clean water supply network expansion in Kondhwa Khurd due to low pressure and contamination.',
      citizen_count: 38,
      spam_count: 2,
      status: 'active'
    },
    {
      id: 2,
      category: 'roads',
      ward_id: 5,
      title: 'Ward 5 Main Road Repair & Streetlighting',
      summary: 'Multiple requests to resurface the main junction road and install streetlights to reduce night accidents.',
      citizen_count: 29,
      spam_count: 0,
      status: 'active'
    },
    {
      id: 3,
      category: 'education',
      ward_id: 3,
      title: 'Ward 3 Public School Classroom Expansion',
      summary: 'High demand to build a new wing of classrooms at the Wanowrie Central School to handle massive student overflow.',
      citizen_count: 24,
      spam_count: 1,
      status: 'active'
    },
    {
      id: 4,
      category: 'health',
      ward_id: 4,
      title: 'Ward 4 Community Health Sub-Center',
      summary: 'Requests for a localized health dispensary since the nearest hospital is over 5km away.',
      citizen_count: 15,
      spam_count: 0,
      status: 'active'
    },
    {
      id: 5,
      category: 'skill',
      ward_id: 2,
      title: 'Ward 2 Youth Vocational Training Center',
      summary: 'Suggestions to set up a skill center near the industrial area to train local youths in assembly work.',
      citizen_count: 12,
      spam_count: 12,
      status: 'active'
    },
    {
      id: 6,
      category: 'sanitation',
      ward_id: 1,
      title: 'Ward 1 Public Sanitation Block',
      summary: 'Requests to build modern, hygienic public toilets in the commercial extension area.',
      citizen_count: 19,
      spam_count: 0,
      status: 'active'
    },
    {
      id: 7,
      category: 'water',
      ward_id: 3,
      title: 'Ward 3 Drinking Water Pipeline Extension',
      summary: 'Extension of clean drinking water mains to newly developed sub-localities in Wanowrie.',
      citizen_count: 11,
      spam_count: 0,
      status: 'active'
    },
    {
      id: 8,
      category: 'roads',
      ward_id: 2,
      title: 'Ward 2 Main Bypass Resurfacing',
      summary: 'Complete re-tarring of the heavy vehicle bypass road in Hadapsar Industrial Zone to prevent accident hazards.',
      citizen_count: 22,
      spam_count: 1,
      status: 'active'
    },
    {
      id: 9,
      category: 'sanitation',
      ward_id: 5,
      title: 'Ward 5 Drainage Network Upgrade',
      summary: 'Upgrading the storm water drainage channels in Mundhwa to prevent seasonal monsoon flooding.',
      citizen_count: 17,
      spam_count: 2,
      status: 'active'
    },
    {
      id: 10,
      category: 'skill',
      ward_id: 1,
      title: 'Ward 1 ITI Vocational Skill Center',
      summary: 'Establishment of an Industrial Training Institute extension to offer welder and fitter trade certifications.',
      citizen_count: 8,
      spam_count: 0,
      status: 'active'
    }
  ],
  cluster_mappings: [
    { submission_id: 'sub-init-1', cluster_id: 1 },
    { submission_id: 'sub-init-2', cluster_id: 2 }
  ],
  projects: [
    { id: 1, cluster_id: 1, title: 'Clean Water Pipeline Upgrade', category: 'water', ward_id: 4, estimated_cost: 350000, status: 'Proposed', citizen_rating: null },
    { id: 2, cluster_id: 2, title: 'Main Road Repair & Streetlighting', category: 'roads', ward_id: 5, estimated_cost: 280000, status: 'Proposed', citizen_rating: null },
    { id: 3, cluster_id: 3, title: 'Public School Classroom Expansion', category: 'education', ward_id: 3, estimated_cost: 420000, status: 'Proposed', citizen_rating: null },
    { id: 4, cluster_id: 4, title: 'Community Health Sub-Center', category: 'health', ward_id: 4, estimated_cost: 600000, status: 'Proposed', citizen_rating: null },
    { id: 5, cluster_id: 5, title: 'Youth Vocational Training Center', category: 'skill', ward_id: 2, estimated_cost: 450000, status: 'Proposed', citizen_rating: null },
    { id: 6, cluster_id: 6, title: 'Public Sanitation Block Construction', category: 'sanitation', ward_id: 1, estimated_cost: 380000, status: 'Proposed', citizen_rating: null },
    { id: 7, cluster_id: 7, title: 'Drinking Water Pipeline Extension', category: 'water', ward_id: 3, estimated_cost: 550000, status: 'Proposed', citizen_rating: null },
    { id: 8, cluster_id: 8, title: 'Main Bypass Resurfacing Work', category: 'roads', ward_id: 2, estimated_cost: 920000, status: 'Proposed', citizen_rating: null },
    { id: 9, cluster_id: 9, title: 'Drainage Network Upgrade & Desilting', category: 'sanitation', ward_id: 5, estimated_cost: 480000, status: 'Proposed', citizen_rating: null },
    { id: 10, cluster_id: 10, title: 'ITI Vocational Skill Center Setup', category: 'skill', ward_id: 1, estimated_cost: 1200000, status: 'Proposed', citizen_rating: null }
  ],
  decision_logs: [
    { id: 1, timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), project_id: 1, action: 'Proposed', actor: 'System', previous_state: null, new_state: 'Proposed', reason: 'Seeded at startup' }
  ]
};

// Local helper to load or initialize mock database state
function getMockDB() {
  if (typeof window === 'undefined') {
    return INITIAL_MOCK_DATA;
  }
  const existing = localStorage.getItem(MOCK_DB_KEY);
  if (existing) {
    try {
      const parsed = JSON.parse(existing);
      // Migration check: if the first project has cost < 100000, it's the old seed. Reset it!
      if (parsed.projects && parsed.projects.length > 0 && parsed.projects[0].estimated_cost < 100000) {
        console.log("Old seed detected. Migrating to new 10-project seed database...");
        localStorage.setItem(MOCK_DB_KEY, JSON.stringify(INITIAL_MOCK_DATA));
        return INITIAL_MOCK_DATA;
      }
      // Migration check: if the projects length is < 10, upgrade to the 10-project seed
      if (parsed.projects && parsed.projects.length < 10) {
        console.log("Upgrading mock database to 10-project seed...");
        localStorage.setItem(MOCK_DB_KEY, JSON.stringify(INITIAL_MOCK_DATA));
        return INITIAL_MOCK_DATA;
      }
      return parsed;
    } catch (e) {
      // JSON corruption fallback
    }
  }
  localStorage.setItem(MOCK_DB_KEY, JSON.stringify(INITIAL_MOCK_DATA));
  return INITIAL_MOCK_DATA;
}

function saveMockDB(db) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(MOCK_DB_KEY, JSON.stringify(db));
  }
}

// Fluent Mock Query Builder simulating Supabase JS API
class MockQueryBuilder {
  constructor(table) {
    this.table = table;
    this.filters = [];
    this.orderCol = null;
    this.orderAsc = true;
    this.limitVal = null;
  }

  select(fields = '*') {
    return this;
  }

  eq(column, value) {
    this.filters.push((item) => item[column] == value);
    return this;
  }

  order(column, { ascending = true } = {}) {
    this.orderCol = column;
    this.orderAsc = ascending;
    return this;
  }

  limit(val) {
    this.limitVal = val;
    return this;
  }

  async insert(rows) {
    const db = getMockDB();
    const tableData = db[this.table] || [];
    const formattedRows = Array.isArray(rows) ? rows : [rows];
    
    formattedRows.forEach(row => {
      // Auto-increment IDs if numeric
      if (row.id === undefined) {
        const ids = tableData.map(r => r.id).filter(id => typeof id === 'number');
        row.id = ids.length ? Math.max(...ids) + 1 : 1;
      }
      if (row.created_at === undefined && this.table === 'submissions') {
        row.created_at = new Date().toISOString();
      }
      tableData.push(row);
    });

    db[this.table] = tableData;
    saveMockDB(db);
    return { data: formattedRows, error: null };
  }

  async update(values) {
    const db = getMockDB();
    const tableData = db[this.table] || [];
    let updatedCount = 0;
    
    const updatedData = tableData.map(item => {
      // Check if item matches current filter chain
      if (this.filters.every(f => f(item))) {
        updatedCount++;
        return { ...item, ...values };
      }
      return item;
    });

    db[this.table] = updatedData;
    saveMockDB(db);
    return { data: updatedData.filter(item => this.filters.every(f => f(item))), error: null, count: updatedCount };
  }

  async delete() {
    const db = getMockDB();
    const tableData = db[this.table] || [];
    const keptData = tableData.filter(item => !this.filters.every(f => f(item)));
    db[this.table] = keptData;
    saveMockDB(db);
    return { data: null, error: null };
  }

  // standard promise resolver
  async then(resolve) {
    try {
      const db = getMockDB();
      const data = db[this.table] || [];
      let result = data.filter(item => this.filters.every(f => f(item)));
      
      if (this.orderCol) {
        result.sort((a, b) => {
          let valA = a[this.orderCol];
          let valB = b[this.orderCol];
          if (typeof valA === 'string') {
            return this.orderAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
          }
          return this.orderAsc ? valA - valB : valB - valA;
        });
      }
      
      if (this.limitVal) {
        result = result.slice(0, this.limitVal);
      }

      resolve({ data: JSON.parse(JSON.stringify(result)), error: null });
    } catch (e) {
      resolve({ data: null, error: e.message });
    }
  }
}

// Unified client export (automatically uses Service Role Key on server for RLS bypass, and Anon Key on client)
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const activeKey = (typeof window === 'undefined' && serviceKey) ? serviceKey : supabaseAnonKey;

export const supabase = isConfigured
  ? createClient(supabaseUrl, activeKey)
  : {
      from: (table) => new MockQueryBuilder(table),
      storage: {
        from: (bucket) => ({
          upload: async (path, file) => {
            // Mock file upload path returns mock URL path
            console.log(`Mock upload to ${bucket}/${path}`);
            return {
              data: { path },
              error: null
            };
          },
          getPublicUrl: (path) => ({
            data: {
              publicUrl: `/mock-assets/${path}`
            }
          })
        })
      },
      // Mock RCP RPC similarity calls
      rpc: async (functionName, params) => {
        console.log(`Mock RPC call: ${functionName}`, params);
        if (functionName === 'match_submissions') {
          // Perform simple keyword similarity
          return { data: [], error: null };
        }
        return { data: null, error: 'Function not mocked' };
      }
    };

export const isLiveSupabase = isConfigured;
