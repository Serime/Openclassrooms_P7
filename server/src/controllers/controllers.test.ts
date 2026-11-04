import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { app } from '../app';
import { contactService } from '../services/contactService';
import { organizationService } from '../services/organizationService';

vi.mock('../services/contactService', () => ({
  contactService: {
    getAllContacts: vi.fn(),
    getContactById: vi.fn(),
    createContact: vi.fn(),
    updateContact: vi.fn(),
    deleteContact: vi.fn(),
    getContactStats: vi.fn(),
  },
}));

vi.mock('../services/organizationService', () => ({
  organizationService: {
    getAllOrganizations: vi.fn(),
    getOrganizationById: vi.fn(),
    createOrganization: vi.fn(),
    updateOrganization: vi.fn(),
    deleteOrganization: vi.fn(),
    getOrganizationStats: vi.fn(),
  },
}));

type Mocked = ReturnType<typeof vi.fn>;

interface ControllerCase {
  name: string;
  path: string;
  notFound: string;
  getAll: Mocked;
  getById: Mocked;
  create: Mocked;
  update: Mocked;
  remove: Mocked;
  stats: Mocked;
  valid: Record<string, unknown>;
  invalid: Record<string, unknown>;
}

const cases: ControllerCase[] = [
  {
    name: 'contacts',
    path: '/api/contacts',
    notFound: 'Contact not found',
    getAll: contactService.getAllContacts as unknown as Mocked,
    getById: contactService.getContactById as unknown as Mocked,
    create: contactService.createContact as unknown as Mocked,
    update: contactService.updateContact as unknown as Mocked,
    remove: contactService.deleteContact as unknown as Mocked,
    stats: contactService.getContactStats as unknown as Mocked,
    valid: { firstName: 'Maria', lastName: 'Durand', email: 'maria@example.org' },
    invalid: { firstName: '', lastName: 'Durand', email: 'not-an-email' },
  },
  {
    name: 'organizations',
    path: '/api/organizations',
    notFound: 'Organization not found',
    getAll: organizationService.getAllOrganizations as unknown as Mocked,
    getById: organizationService.getOrganizationById as unknown as Mocked,
    create: organizationService.createOrganization as unknown as Mocked,
    update: organizationService.updateOrganization as unknown as Mocked,
    remove: organizationService.deleteOrganization as unknown as Mocked,
    stats: organizationService.getOrganizationStats as unknown as Mocked,
    valid: { name: 'Isotope SA', website: 'https://example.org' },
    invalid: { name: '', website: 'not-a-url' },
  },
];

describe.each(cases)('$path', (resource) => {
  const record = { id: 'id-1', ...resource.valid };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists records', async () => {
    resource.getAll.mockResolvedValue([record]);

    const res = await request(app).get(resource.path);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([record]);
  });

  it('answers 500 when listing fails', async () => {
    resource.getAll.mockRejectedValue(new Error('database down'));

    expect((await request(app).get(resource.path)).status).toBe(500);
  });

  it('returns one record, 404 when unknown and 500 on failure', async () => {
    resource.getById.mockResolvedValueOnce(record);
    resource.getById.mockRejectedValueOnce(new Error(resource.notFound));
    resource.getById.mockRejectedValueOnce(new Error('database down'));

    expect((await request(app).get(`${resource.path}/id-1`)).status).toBe(200);
    expect((await request(app).get(`${resource.path}/missing`)).status).toBe(404);
    expect((await request(app).get(`${resource.path}/id-1`)).status).toBe(500);
  });

  it('creates a valid record and rejects invalid input', async () => {
    resource.create.mockResolvedValue(record);

    const created = await request(app).post(resource.path).send(resource.valid);
    const rejected = await request(app).post(resource.path).send(resource.invalid);

    expect(created.status).toBe(201);
    expect(resource.create).toHaveBeenCalledWith(expect.objectContaining(resource.valid));
    expect(rejected.status).toBe(400);
    expect(resource.create).toHaveBeenCalledTimes(1);
  });

  it('updates a record, 404 when unknown and 400 on invalid input', async () => {
    resource.update.mockResolvedValueOnce(record);
    resource.update.mockRejectedValueOnce(new Error(resource.notFound));

    expect((await request(app).put(`${resource.path}/id-1`).send(resource.valid)).status).toBe(200);
    expect((await request(app).put(`${resource.path}/missing`).send(resource.valid)).status).toBe(404);
    expect((await request(app).put(`${resource.path}/id-1`).send(resource.invalid)).status).toBe(400);
  });

  it('deletes a record, 404 when unknown and 500 on failure', async () => {
    resource.remove.mockResolvedValueOnce(undefined);
    resource.remove.mockRejectedValueOnce(new Error(resource.notFound));
    resource.remove.mockRejectedValueOnce(new Error('database down'));

    expect((await request(app).delete(`${resource.path}/id-1`)).status).toBe(204);
    expect((await request(app).delete(`${resource.path}/missing`)).status).toBe(404);
    expect((await request(app).delete(`${resource.path}/id-1`)).status).toBe(500);
  });

  it('returns statistics and 500 on failure', async () => {
    resource.stats.mockResolvedValueOnce({ total: 2 });
    resource.stats.mockRejectedValueOnce(new Error('database down'));

    const ok = await request(app).get(`${resource.path}/stats`);
    const failed = await request(app).get(`${resource.path}/stats`);

    expect(ok.body).toEqual({ total: 2 });
    expect(failed.status).toBe(500);
  });
});
