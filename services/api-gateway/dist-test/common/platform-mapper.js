"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toMediaPlatform = toMediaPlatform;
exports.fromMediaPlatform = fromMediaPlatform;
exports.toApiJobStatus = toApiJobStatus;
exports.toDbJobStatus = toDbJobStatus;
const types_1 = require("@reelgrabber/types");
const database_1 = require("@reelgrabber/database");
const PLATFORM_TO_DB = {
    [types_1.Platform.INSTAGRAM]: database_1.MediaPlatform.INSTAGRAM,
    [types_1.Platform.TIKTOK]: database_1.MediaPlatform.TIKTOK,
    [types_1.Platform.FACEBOOK]: database_1.MediaPlatform.FACEBOOK,
    [types_1.Platform.TWITTER]: database_1.MediaPlatform.TWITTER,
    [types_1.Platform.PINTEREST]: database_1.MediaPlatform.PINTEREST,
    [types_1.Platform.THREADS]: database_1.MediaPlatform.THREADS,
    [types_1.Platform.UNKNOWN]: null,
};
const DB_TO_PLATFORM = {
    [database_1.MediaPlatform.INSTAGRAM]: types_1.Platform.INSTAGRAM,
    [database_1.MediaPlatform.TIKTOK]: types_1.Platform.TIKTOK,
    [database_1.MediaPlatform.FACEBOOK]: types_1.Platform.FACEBOOK,
    [database_1.MediaPlatform.TWITTER]: types_1.Platform.TWITTER,
    [database_1.MediaPlatform.PINTEREST]: types_1.Platform.PINTEREST,
    [database_1.MediaPlatform.THREADS]: types_1.Platform.THREADS,
};
function toMediaPlatform(platform) {
    const mapped = PLATFORM_TO_DB[platform];
    if (!mapped) {
        throw new Error(`Unsupported platform: ${platform}`);
    }
    return mapped;
}
function fromMediaPlatform(platform) {
    return DB_TO_PLATFORM[platform];
}
function toApiJobStatus(status) {
    switch (status) {
        case database_1.JobStatus.QUEUED:
            return 'queued';
        case database_1.JobStatus.PROCESSING:
            return 'processing';
        case database_1.JobStatus.COMPLETED:
            return 'completed';
        case database_1.JobStatus.FAILED:
            return 'failed';
        default:
            return 'queued';
    }
}
function toDbJobStatus(status) {
    switch (status) {
        case 'queued':
            return database_1.JobStatus.QUEUED;
        case 'processing':
            return database_1.JobStatus.PROCESSING;
        case 'completed':
            return database_1.JobStatus.COMPLETED;
        case 'failed':
            return database_1.JobStatus.FAILED;
        default:
            return database_1.JobStatus.QUEUED;
    }
}
//# sourceMappingURL=platform-mapper.js.map