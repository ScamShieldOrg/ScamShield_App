import test from "node:test"
import assert from "node:assert/strict"
import {
  buildReportPageRange,
  extractReportNumericId,
  formatReportPhoneDisplay,
  getNextTabIndex,
} from "../src/components/features/report/report-helpers.ts"

test("buildReportPageRange returns full range when totalPages <= 7", () => {
  assert.deepEqual(buildReportPageRange(1, 5), [1, 2, 3, 4, 5])
  assert.deepEqual(buildReportPageRange(4, 7), [1, 2, 3, 4, 5, 6, 7])
})

test("buildReportPageRange inserts ellipses for large page counts", () => {
  assert.deepEqual(buildReportPageRange(1, 12), [1, 2, "ellipsis-right", 12])
  assert.deepEqual(buildReportPageRange(6, 12), [
    1,
    "ellipsis-left",
    5,
    6,
    7,
    "ellipsis-right",
    12,
  ])
  assert.deepEqual(buildReportPageRange(12, 12), [1, "ellipsis-left", 11, 12])
})

test("extractReportNumericId strips prefixes safely", () => {
  assert.equal(extractReportNumericId("#RPT-1042"), "1042")
  assert.equal(extractReportNumericId("RPT-88"), "88")
  assert.equal(extractReportNumericId(501), "501")
})

test("formatReportPhoneDisplay formats 10-digit VN and +84 numbers", () => {
  assert.equal(formatReportPhoneDisplay("0912345678"), "0912 345 678")
  assert.equal(formatReportPhoneDisplay("+84912345678"), "+84 912 345 678")
  assert.equal(formatReportPhoneDisplay("1900 1234"), "1900 1234")
})

test("getNextTabIndex wraps around for keyboard navigation", () => {
  assert.equal(getNextTabIndex(0, 6, "ArrowLeft"), 5)
  assert.equal(getNextTabIndex(5, 6, "ArrowRight"), 0)
  assert.equal(getNextTabIndex(3, 6, "Home"), 0)
  assert.equal(getNextTabIndex(3, 6, "End"), 5)
  assert.equal(getNextTabIndex(3, 6, "Enter"), null)
})
