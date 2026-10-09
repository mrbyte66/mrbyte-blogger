import { beforeEach, expect, it, vi } from "vitest";
import { articlePublishAction } from "../lib/api/series-publication";
import { api } from "../lib/api/http";
vi.mock("../lib/api/http", () => ({ api: vi.fn() }));
beforeEach(() => vi.clearAllMocks());
it("uses the refreshed draft series version after membership save", async () => {
  vi.mocked(api).mockResolvedValue({ data: { status: "draft", version: 7 }, etag: null, status: 200 });
  expect(await articlePublishAction("series-id")).toEqual({ action: "publish", publishSeries: true, seriesVersion: 7 });
  expect(api).toHaveBeenCalledWith("GET", "/studio/series/series-id");
});
it.each(["published", "archived", "trashed"])("does not activate an already %s series", async (status) => {
  vi.mocked(api).mockResolvedValue({ data: { status, version: 9 }, etag: null, status: 200 });
  expect(await articlePublishAction("series-id")).toEqual({ action: "publish" });
});
it("does not fetch series for standalone articles", async () => {
  expect(await articlePublishAction(null)).toEqual({ action: "publish" });
  expect(api).not.toHaveBeenCalled();
});
it("stops on a failed series refresh", async () => {
  vi.mocked(api).mockRejectedValue(new Error("unavailable"));
  await expect(articlePublishAction("series-id")).rejects.toThrow("unavailable");
});
