export type PropTuple = [type: number, value: any]

interface PropTypeSelector {
    [k: string]: (value: any) => any
}

export function createPropsReviver() {
    const propTypes: PropTypeSelector = {
        0: (value) => reviveObject(value),
        1: (value) => reviveArray(value),
        2: (value) => new RegExp(value),
        3: (value) => new Date(value),
        4: (value) => new Map(reviveArray(value)),
        5: (value) => new Set(reviveArray(value)),
        6: (value) => BigInt(value),
        7: (value) => new URL(value),
        8: (value) => new Uint8Array(value),
        9: (value) => new Uint16Array(value),
        10: (value) => new Uint32Array(value),
        11: (value) => Number.POSITIVE_INFINITY * value
    }

    // Not using JSON.parse reviver because it's bottom-up but we want top-down
    const reviveTuple = (raw: any): any => {
        const [type, value] = raw as PropTuple
        if (typeof type !== 'number') {
            throw new Error(
                `Invalid prop tuple: expected first element to be a number, got ${typeof type}`
            )
        }
        if (!(type in propTypes)) {
            throw new Error(`Unknown prop type: ${type}`)
        }
        const valueFn = propTypes[type]
        if (typeof valueFn !== 'function') {
            throw new Error(
                `Invalid prop type handler: expected a function, got ${typeof valueFn}`
            )
        }

        return type in propTypes ? valueFn(value) : undefined
    }

    const reviveArray = (raw: any): any => (raw as Array<any>).map(reviveTuple)

    const reviveObject = (raw: any): any => {
        if (typeof raw !== 'object' || raw === null) return raw
        return Object.fromEntries(
            Object.entries(raw).map(([key, value]) => [key, reviveTuple(value)])
        )
    }

    return {
        reviveTuple,
        reviveArray,
        reviveObject
    }
}

function safeParse(raw: string) {
    try {
        return JSON.parse(raw)
    } catch (error) {
        throw new Error(`Invalid JSON string: ${error}`)
    }
}

export function reviveProps(raw: string) {
    const parsed = safeParse(raw)
    const reviver = createPropsReviver()
    return reviver.reviveObject(parsed)
}
