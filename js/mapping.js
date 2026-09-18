import { state } from './state.js';
import { columnToken, variableKeys } from './variables.js';

function normalize(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9]/g, ""); }

export function autoMap() {
  const aliases = {
    NAME: ["name", "fullname", "participantname", "participant", "recipient", "studentname", "attendeename"],
    ROLE: ["role", "designation", "type", "participationtype", "category", "participanttype"],
    EVENT: ["event", "eventname", "conference", "program", "programme"],
    DATE: ["date", "eventdate", "issuedate"],
    VENUE: ["venue", "location", "place"],
    INSTITUTION: ["institution", "college", "university", "hospital", "affiliation"],
    DEPARTMENT: ["department", "dept"],
    EMAIL: ["email", "emailaddress", "mail"],
    ORGANIZATION: ["organization", "organisation", "org"]
  };
  const m = {};
  variableKeys.forEach(v => {
    const found = state.columns.find(c => {
      const n = normalize(c);
      return (aliases[v] || []).some(a => n === a || n.includes(a));
    });
    if (found) m[v] = found;
  });
  state.mappings = m;
}

export function mappedRows() {
  return state.rows.map(r => {
    const o = Object.assign({}, state.globalFields || {});
    Object.entries(r).forEach(([k, v]) => { const token = columnToken(k); if (token && !variableKeys.includes(token)) o[token] = v; });
    Object.entries(state.mappings).forEach(([v, col]) => { if (col) o[v] = r[col]; });
    return o;
  });
}
