// Proves one account can never see or change another account's data.
// Needs the dev server running against the DEV database:
//   npm run test:isolation
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000';
const PASSWORD = 'isolation-test-pw-1';
const db = new pg.Pool({ connectionString: process.env.POSTGRES_URL });

async function signUp(label) {
    const email = `iso-${label}-${Date.now()}@example.test`;
    const res = await fetch(`${BASE}/api/auth/sign-up/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: BASE },
        body: JSON.stringify({ email, password: PASSWORD, name: `Isolation ${label}` }),
    });
    const body = await res.json();
    assert.equal(res.status, 200, `sign-up ${label} failed: ${JSON.stringify(body)}`);
    const cookie = res.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
    return { email, cookie, userId: body.user.id };
}

// Returns a request function acting as `user` (or signed out when null)
function as(user) {
    return async (path, { method = 'GET', body } = {}) => {
        const res = await fetch(`${BASE}${path}`, {
            method,
            headers: {
                'Content-Type': 'application/json',
                Origin: BASE,
                ...(user ? { Cookie: user.cookie } : {}),
            },
            body: body === undefined ? undefined : JSON.stringify(body),
        });
        const text = await res.text();
        let data;
        try { data = JSON.parse(text); } catch { data = text; }
        return { status: res.status, data };
    };
}

let alice, bob, asAlice, asBob, aliceChild, aliceRecordId, aliceInvoiceId;

before(async () => {
    alice = await signUp('alice');
    bob = await signUp('bob');
    asAlice = as(alice);
    asBob = as(bob);

    const created = await asAlice('/api/children', {
        method: 'POST',
        body: { name: 'Alice Child', rate: 6, email: 'parent@example.test' },
    });
    assert.equal(created.status, 200, JSON.stringify(created.data));
    aliceChild = created.data;

    const logged = await asAlice('/api/attendance', {
        method: 'POST',
        body: { action: 'logHours', childId: aliceChild.id, hours: 3, date: '2026-11-02' },
    });
    assert.equal(logged.status, 200, JSON.stringify(logged.data));

    const detail = await asAlice(`/api/children/${aliceChild.id}`);
    aliceRecordId = detail.data.attendance[0].id;

    const invoice = await asAlice('/api/invoices', {
        method: 'POST',
        body: {
            childId: aliceChild.id, childName: 'Alice Child', parentEmail: 'parent@example.test',
            amount: 18, period: 'November 2026', totalHours: 3, hourlyRate: 6,
        },
    });
    assert.equal(invoice.status, 200, JSON.stringify(invoice.data));
    aliceInvoiceId = invoice.data.invoice.id;
});

after(async () => {
    for (const user of [alice, bob]) {
        if (user) await as(user)('/api/auth/delete-user', { method: 'POST', body: { password: PASSWORD } });
    }
    await db.end();
});

test('signed-out API requests are rejected', async () => {
    for (const path of ['/api/children', '/api/dashboard', '/api/settings', '/api/invoices', '/api/sync', `/api/children/${aliceChild.id}`]) {
        const res = await as(null)(path);
        assert.equal(res.status, 401, path);
    }
});

test('lists only contain your own children and hours', async () => {
    const children = await asBob('/api/children');
    assert.equal(children.status, 200);
    assert.ok(!children.data.some((c) => c.id === aliceChild.id));

    const dashboard = await asBob('/api/dashboard');
    assert.ok(!dashboard.data.children.some((c) => c.id === aliceChild.id));

    const sync = await asBob('/api/sync');
    assert.ok(!sync.data.children.some((c) => c.id === aliceChild.id));
    assert.ok(!sync.data.attendance.some((a) => a.id === aliceRecordId));

    const own = await asAlice('/api/children');
    assert.ok(own.data.some((c) => c.id === aliceChild.id));
});

test("another user cannot read, edit or delete your child", async () => {
    assert.equal((await asBob(`/api/children/${aliceChild.id}`)).status, 404);
    assert.equal((await asBob('/api/children', { method: 'POST', body: { id: aliceChild.id, name: 'Hijacked' } })).status, 404);
    assert.equal((await asBob(`/api/children/${aliceChild.id}`, { method: 'DELETE', body: { deleteType: 'child' } })).status, 404);

    const still = await asAlice(`/api/children/${aliceChild.id}`);
    assert.equal(still.status, 200);
    assert.equal(still.data.child.name, 'Alice Child');
});

test("another user cannot log, change or delete hours on your child", async () => {
    assert.equal((await asBob('/api/attendance', { method: 'POST', body: { action: 'logHours', childId: aliceChild.id, hours: 9 } })).status, 404);
    assert.equal((await asBob(`/api/children/${aliceChild.id}`, { method: 'PUT', body: { action: 'logHours', hours: 9, date: '2026-11-02' } })).status, 404);
    assert.equal((await asBob('/api/attendance', { method: 'DELETE', body: { id: aliceRecordId } })).status, 404);
    assert.equal((await asBob(`/api/children/${aliceChild.id}`, { method: 'DELETE', body: { deleteType: 'attendance', recordId: aliceRecordId } })).status, 404);

    // Moving Alice's record onto Bob's own child must fail too
    const bobChild = (await asBob('/api/children', { method: 'POST', body: { name: 'Bob Child', rate: 5 } })).data;
    const moved = await asBob(`/api/children/${bobChild.id}`, {
        method: 'PUT',
        body: { action: 'updateAttendance', id: aliceRecordId, hours: 9, date: '2026-11-02' },
    });
    assert.equal(moved.status, 404);

    const detail = await asAlice(`/api/children/${aliceChild.id}`);
    assert.equal(detail.data.attendance.length, 1);
    assert.equal(detail.data.attendance[0].hours, 3);
});

test('settings are separate per account', async () => {
    const saved = await asAlice('/api/settings', { method: 'POST', body: { businessName: 'Alice Care', businessEmail: 'alice@example.test' } });
    assert.equal(saved.status, 200);

    const bobSettings = await asBob('/api/settings');
    assert.equal(bobSettings.status, 200);
    assert.equal(bobSettings.data.businessName, '');

    const aliceSettings = await asAlice('/api/settings');
    assert.equal(aliceSettings.data.businessName, 'Alice Care');
});

test("another user cannot see or touch your invoices", async () => {
    const list = await asBob('/api/invoices');
    assert.ok(!list.data.some((i) => i.id === aliceInvoiceId));

    assert.equal((await asBob(`/api/invoices/${aliceInvoiceId}`)).status, 404);
    assert.equal((await asBob(`/api/invoices/${aliceInvoiceId}`, { method: 'PATCH', body: { status: 'Paid' } })).status, 404);
    assert.equal((await asBob(`/api/invoices/${aliceInvoiceId}/pdf`)).status, 404);
    assert.equal((await asBob(`/api/invoices/${aliceInvoiceId}/resend`, { method: 'POST' })).status, 404);
    assert.equal((await asBob(`/api/invoices/${aliceInvoiceId}`, { method: 'DELETE' })).status, 404);
    assert.equal((await asBob('/api/invoices', {
        method: 'POST',
        body: { childId: aliceChild.id, childName: 'Alice Child', parentEmail: 'x@example.test', amount: 1, period: 'November 2026' },
    })).status, 404);

    assert.equal((await asAlice(`/api/invoices/${aliceInvoiceId}`)).status, 200);
});

test('deleting an account removes all of its data', async () => {
    const carol = await signUp('carol');
    const asCarol = as(carol);
    const child = (await asCarol('/api/children', { method: 'POST', body: { name: 'Carol Child', rate: 5, email: 'p@example.test' } })).data;
    await asCarol('/api/attendance', { method: 'POST', body: { action: 'logHours', childId: child.id, hours: 2, date: '2026-11-03' } });
    await asCarol('/api/invoices', { method: 'POST', body: { childId: child.id, childName: 'Carol Child', parentEmail: 'p@example.test', amount: 10, period: 'November 2026' } });
    await asCarol('/api/settings', { method: 'POST', body: { businessName: 'Carol Care' } });

    const deleted = await asCarol('/api/auth/delete-user', { method: 'POST', body: { password: PASSWORD } });
    assert.equal(deleted.status, 200, JSON.stringify(deleted.data));

    const { rows } = await db.query(
        `SELECT
            (SELECT COUNT(*) FROM children WHERE user_id = $1)::int AS children,
            (SELECT COUNT(*) FROM attendance WHERE child_id = $2)::int AS attendance,
            (SELECT COUNT(*) FROM invoices WHERE user_id = $1)::int AS invoices,
            (SELECT COUNT(*) FROM settings WHERE user_id = $1)::int AS settings,
            (SELECT COUNT(*) FROM "user" WHERE id = $1)::int AS users`,
        [carol.userId, child.id]
    );
    assert.deepEqual(rows[0], { children: 0, attendance: 0, invoices: 0, settings: 0, users: 0 });
});
