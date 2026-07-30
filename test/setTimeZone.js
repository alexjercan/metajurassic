// Jest globalSetup: pin the whole suite to one time zone.
//
// Set here rather than inside a test because jest gives each test file a COPY
// of process.env, so assigning TZ from a spec never reaches the V8 date code -
// it silently keeps the machine's zone. globalSetup runs in the main process
// before the workers are forked, and they inherit this.
//
// The zone observes DST (EET/EEST) on purpose: seed <-> date conversion is
// calendar-day arithmetic that used to drift by an hour across a transition
// (tasks/20260729-122943), and CI runs in UTC, which never shifts - so under
// the default zone that whole class of bug is untestable. `test/timeZone.ts`
// re-asserts the zone from inside the specs so this can never go quietly
// missing.
module.exports = () => {
    process.env.TZ = "Europe/Bucharest";
};
