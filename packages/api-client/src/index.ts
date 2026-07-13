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

type ApiHealthResponse = JsonResponse<"getApiHealth", 200>;
type ApiVersionResponse = JsonResponse<"getApiVersion", 200>;

export type {
  ApiHealthResponse,
  ApiOperation,
  ApiOperationId,
  ApiOperations,
  ApiPath,
  ApiPaths,
  ApiVersionResponse,
};
