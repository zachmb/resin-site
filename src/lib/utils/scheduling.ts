/**
 * Calculate the next optimal start time for a note activation based on user availability.
 */
export function getOptimalScheduleTime(profile: any): {
	startTime: Date;
	description: string;
} {
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

	// Default availability window: 4 PM to 10 PM
	const defaultStart = 16; // 4 PM
	const defaultEnd = 22;   // 10 PM

	let startHour = defaultStart;
	let endHour = defaultEnd;

	// Parse availability from profile if available
	if (profile?.availability_start) {
		try {
			const parts = profile.availability_start.split(':');
			startHour = parseInt(parts[0], 10);
		} catch (e) {
			// Use default
		}
	}

	if (profile?.availability_end) {
		try {
			const parts = profile.availability_end.split(':');
			endHour = parseInt(parts[0], 10);
		} catch (e) {
			// Use default
		}
	}

	const availabilityStart = new Date(today);
	availabilityStart.setHours(startHour, 0, 0, 0);

	const availabilityEnd = new Date(today);
	availabilityEnd.setHours(endHour, 0, 0, 0);

	let scheduledTime: Date;
	let description: string;

	if (now < availabilityStart) {
		// Before availability window - schedule for today at start time
		scheduledTime = new Date(availabilityStart);
		description = `Starts at ${formatTime(scheduledTime)}`;
	} else if (now < availabilityEnd) {
		// Within availability window - schedule for in X minutes
		const minutesUntilEnd = Math.floor((availabilityEnd.getTime() - now.getTime()) / 1000 / 60);
		scheduledTime = new Date(now.getTime() + 1000 * 60); // Schedule 1 minute from now
		description = `Starts in ${minutesUntilEnd} min`;
	} else {
		// After availability window - schedule for tomorrow at start time
		scheduledTime = new Date(availabilityStart);
		scheduledTime.setDate(scheduledTime.getDate() + 1);
		description = `Starts tomorrow at ${formatTime(scheduledTime)}`;
	}

	return { startTime: scheduledTime, description };
}

/**
 * Format time as "4:00 PM" or "10:30 PM"
 */
function formatTime(date: Date): string {
	return date.toLocaleTimeString('en-US', {
		hour: 'numeric',
		minute: '2-digit',
		hour12: true
	});
}
