"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const database_1 = require("@reelgrabber/database");
const types_1 = require("@reelgrabber/types");
const platform_mapper_1 = require("./platform-mapper");
(0, node_test_1.describe)('platform-mapper', () => {
    (0, node_test_1.it)('maps Platform to MediaPlatform and back', () => {
        strict_1.default.equal((0, platform_mapper_1.toMediaPlatform)(types_1.Platform.INSTAGRAM), database_1.MediaPlatform.INSTAGRAM);
        strict_1.default.equal((0, platform_mapper_1.fromMediaPlatform)(database_1.MediaPlatform.TIKTOK), types_1.Platform.TIKTOK);
    });
    (0, node_test_1.it)('maps Prisma JobStatus to API job status', () => {
        strict_1.default.equal((0, platform_mapper_1.toApiJobStatus)(database_1.JobStatus.QUEUED), 'queued');
        strict_1.default.equal((0, platform_mapper_1.toApiJobStatus)(database_1.JobStatus.COMPLETED), 'completed');
        strict_1.default.equal((0, platform_mapper_1.toApiJobStatus)(database_1.JobStatus.FAILED), 'failed');
    });
    (0, node_test_1.it)('throws for unsupported platforms', () => {
        strict_1.default.throws(() => (0, platform_mapper_1.toMediaPlatform)(types_1.Platform.UNKNOWN));
    });
});
//# sourceMappingURL=platform-mapper.test.js.map