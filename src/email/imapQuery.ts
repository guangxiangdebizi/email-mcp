import type { SearchObject } from "imapflow";

function parseDate(value: string, field: string): Date {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(date.getTime())) {
    throw new Error(`${field} must use YYYY-MM-DD format`);
  }
  return date;
}

export function buildImapSearchQuery(query: string): SearchObject {
  const result: SearchObject = {};
  const remaining: string[] = [];
  const tokenPattern = /([a-zA-Z]+):(?:"([^"]*)"|(\S+))|"([^"]+)"|(\S+)/g;

  for (const match of query.matchAll(tokenPattern)) {
    const field = match[1]?.toLowerCase();
    const value = match[2] ?? match[3];
    if (!field || value === undefined) {
      remaining.push(match[4] ?? match[5] ?? "");
      continue;
    }
    if (!value) {
      remaining.push(`${field}:`);
      continue;
    }

    switch (field) {
      case "from":
        result.from = value;
        break;
      case "to":
        result.to = value;
        break;
      case "cc":
        result.cc = value;
        break;
      case "subject":
        result.subject = value;
        break;
      case "since":
        result.since = parseDate(value, "since");
        break;
      case "before":
        result.before = parseDate(value, "before");
        break;
      case "is":
        if (["unread", "unseen"].includes(value.toLowerCase())) result.seen = false;
        else if (["read", "seen"].includes(value.toLowerCase())) result.seen = true;
        else remaining.push(`${field}:${value}`);
        break;
      default:
        remaining.push(`${field}:${value}`);
    }
  }

  if (remaining.length) result.text = remaining.join(" ");
  if (!Object.keys(result).length) result.all = true;
  return result;
}
