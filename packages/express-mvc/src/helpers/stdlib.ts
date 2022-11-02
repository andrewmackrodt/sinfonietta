export function isConstructable(object: unknown): boolean {
    return typeof object === 'function' && Boolean(object.prototype?.constructor)
}

export function isFalseRegExp(s: string): boolean {
    return Boolean(/^(?:0|[Ff]alse|[Oo]ff|[Nn]o)$/.exec(s))
}

export function isTrueRegExp(s: string): boolean {
    return Boolean(/^(?:1|[Tt]rue|[Oo]n|[Yy]es)$/.exec(s))
}
