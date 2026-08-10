export function toolSuccess(value) {
    return {
        content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
    };
}
export function toolError(prefix, error) {
    const detail = error instanceof Error ? error.message : "Unknown error";
    return {
        isError: true,
        content: [{ type: "text", text: `${prefix}: ${detail}` }],
    };
}
