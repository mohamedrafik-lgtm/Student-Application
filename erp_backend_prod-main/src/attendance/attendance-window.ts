import moment from 'moment-timezone';

const ATTENDANCE_TIME_ZONE = 'Africa/Cairo';
const SESSION_END_TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function getSessionAttendanceDeadline(sessionDate: Date, endTime: string): Date | null {
  if (!SESSION_END_TIME_PATTERN.test(endTime)) return null;

  const cairoDate = moment(sessionDate).tz(ATTENDANCE_TIME_ZONE).format('YYYY-MM-DD');
  const sessionEnd = moment.tz(
    `${cairoDate} ${endTime}`,
    'YYYY-MM-DD HH:mm',
    ATTENDANCE_TIME_ZONE,
  );

  return sessionEnd.add(24, 'hours').toDate();
}
