/**
 * @typedef {{id:string, mode:'word'|'phrase'|'startsWith'|'endsWith'|'contains'|'length'|'regex', value:string, kind:'positive'|'negative', caseSensitive:boolean}} Rule
 * @typedef {{id:string, name:string, enabled:boolean, rules:Rule[]}} Profile
 * @typedef {{id:string, connect:Function, disconnect:Function}} ConnectionAdapter
 * @typedef {{suggest:({subject:string, signal:AbortSignal}) => Promise<string[]>}} SuggestionProvider
 */
export {};
