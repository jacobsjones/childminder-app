export const CONNECTION_ERROR = 'Couldn’t reach LittleHours. Check your connection and try again.';

// Runs a submit action; if it throws (e.g. offline), reports a short message.
// onFail should show the message and reset the form's busy state.
export async function guarded(action, onFail) {
    try {
        await action();
    } catch (error) {
        console.error('Auth request failed:', error);
        onFail(CONNECTION_ERROR);
    }
}
