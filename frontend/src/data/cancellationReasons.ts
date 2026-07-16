import policy from "../../../shared/filtory_policy.json"
export const cancellationReasons = policy.cancellationReasons.map((reason) => [reason.id, reason.labelKo] as const)
