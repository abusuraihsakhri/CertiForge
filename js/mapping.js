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

/**
 * Merge globals + arbitrary column tokens + explicit mappings per row.
 * An empty cell never blanks a conference-wide value: mapped cells override
 * globals only when they actually contain something.
 */
export function mappedRows() {
  return state.rows.map(r => {
    const o = Object.assign({}, state.globalFields || {});
    Object.entries(r).forEach(([k, v]) => {
      if (k === "__proto__" || k === "constructor" || k === "prototype") return;
      const token = columnToken(k);
      if (token && !variableKeys.includes(token)) o[token] = v;
    });
    Object.entries(state.mappings || {}).forEach(([v, col]) => {
      if (!col || !variableKeys.includes(v)) return;
      const val = r[col];
      if (val != null && String(val).trim() !== "") o[v] = String(val);
    });
    return o;
  });
}
