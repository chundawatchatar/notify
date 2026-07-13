import type { operations, paths } from "./generated/schema";

type ApiPaths = paths;
type ApiPath = keyof ApiPaths;
type ApiOperations = operations;
type ApiOperationId = keyof ApiOperations;
type ApiOperation<OperationId extends ApiOperationId> = ApiOperations[OperationId];

type JsonResponse<
  OperationId extends ApiOperationId,
  Status extends keyof ApiOperation<OperationId>["responses"],
> = ApiOperation<OperationId>["responses"][Status] extends {
  content: { "application/json": infer Body };
}
  ? Body
  : never;

type ApiLivenessResponse = JsonResponse<"getApiLiveness", 200>;
type ApiReadinessResponse = JsonResponse<"getApiReadiness", 200>;
type ApiVersionResponse = JsonResponse<"getApiVersion", 200>;

export type {
  ApiLivenessResponse,
  ApiOperation,
  ApiOperationId,
  ApiOperations,
  ApiPath,
  ApiPaths,
  ApiReadinessResponse,
  ApiVersionResponse,
};
