import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OrganizationForm from './OrganizationForm';
import { useCreateOrganization, useOrganization, useUpdateOrganization } from '../hooks/useOrganizations';

vi.mock('../hooks/useOrganizations', () => ({
  useOrganization: vi.fn(),
  useCreateOrganization: vi.fn(),
  useUpdateOrganization: vi.fn(),
}));

const createMutation = { mutateAsync: vi.fn(), isPending: false };
const updateMutation = { mutateAsync: vi.fn(), isPending: false };

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/organizations" element={<p>Liste des organisations</p>} />
        <Route path="/organizations/new" element={<OrganizationForm />} />
        <Route path="/organizations/:id/edit" element={<OrganizationForm />} />
      </Routes>
    </MemoryRouter>,
  );
}

function fill(label: RegExp, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

describe('OrganizationForm', () => {
  beforeEach(() => {
    vi.mocked(useOrganization).mockReturnValue({ data: undefined, isLoading: false } as unknown as ReturnType<typeof useOrganization>);
    vi.mocked(useCreateOrganization).mockReturnValue(createMutation as unknown as ReturnType<typeof useCreateOrganization>);
    vi.mocked(useUpdateOrganization).mockReturnValue(updateMutation as unknown as ReturnType<typeof useUpdateOrganization>);
    createMutation.mutateAsync.mockReset();
    updateMutation.mutateAsync.mockReset();
  });

  it('creates an organization and leaves optional fields undefined', async () => {
    createMutation.mutateAsync.mockResolvedValue({});
    renderAt('/organizations/new');

    fill(/name/i, 'Isotope SA');
    fill(/website/i, 'https://example.org');
    fireEvent.click(screen.getByRole('button', { name: 'Create Organization' }));

    await screen.findByText('Liste des organisations');
    expect(createMutation.mutateAsync).toHaveBeenCalledWith({
      name: 'Isotope SA',
      industry: undefined,
      website: 'https://example.org',
      description: undefined,
    });
  });

  it('shows an error when saving fails', async () => {
    createMutation.mutateAsync.mockRejectedValue(new Error('500'));
    renderAt('/organizations/new');

    fill(/name/i, 'Isotope SA');
    fireEvent.click(screen.getByRole('button', { name: 'Create Organization' }));

    expect(await screen.findByText('Failed to save organization. Please try again.')).toBeTruthy();
  });

  it('prefills and updates an existing organization', async () => {
    vi.mocked(useOrganization).mockReturnValue({
      data: { id: 'o-1', name: 'Isotope SA', industry: 'Textile', website: null, description: null },
      isLoading: false,
    } as unknown as ReturnType<typeof useOrganization>);
    updateMutation.mutateAsync.mockResolvedValue({});
    renderAt('/organizations/o-1/edit');

    await waitFor(() => expect((screen.getByLabelText(/industry/i) as HTMLInputElement).value).toBe('Textile'));
    fill(/description/i, 'Client historique');
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await screen.findByText('Liste des organisations');
    expect(updateMutation.mutateAsync).toHaveBeenCalledWith({
      id: 'o-1',
      input: { name: 'Isotope SA', industry: 'Textile', website: undefined, description: 'Client historique' },
    });
  });

  it('shows a loading message while the organization is fetched', () => {
    vi.mocked(useOrganization).mockReturnValue({ data: undefined, isLoading: true } as unknown as ReturnType<typeof useOrganization>);
    renderAt('/organizations/o-1/edit');

    expect(screen.getByText('Loading organization...')).toBeTruthy();
  });
});
