import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import OrganizationList from './OrganizationList';
import { useDeleteOrganization, useOrganizations } from '../hooks/useOrganizations';

vi.mock('../hooks/useOrganizations', () => ({
  useOrganizations: vi.fn(),
  useDeleteOrganization: vi.fn(),
}));

const deleteMutation = { mutateAsync: vi.fn() };

const organizations = [
  {
    id: 'org-1',
    name: 'Isotope SA',
    industry: 'Conseil',
    website: 'https://isotope.example',
    description: 'Cabinet de conseil',
    contacts: [{ id: 'c-1' }, { id: 'c-2' }],
  },
  { id: 'org-2', name: 'Atelier Nord' },
];

function mockOrganizations(result: object) {
  vi.mocked(useOrganizations).mockReturnValue(result as unknown as ReturnType<typeof useOrganizations>);
}

function renderList() {
  render(
    <MemoryRouter>
      <OrganizationList />
    </MemoryRouter>,
  );
}

function cardOf(name: string) {
  return screen.getByRole('heading', { name }).parentElement as HTMLElement;
}

describe('OrganizationList', () => {
  beforeEach(() => {
    vi.mocked(useDeleteOrganization).mockReturnValue(
      deleteMutation as unknown as ReturnType<typeof useDeleteOrganization>,
    );
    deleteMutation.mutateAsync.mockReset();
    mockOrganizations({ data: organizations, isLoading: false, error: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows a loading message while the organizations are fetched', () => {
    mockOrganizations({ data: undefined, isLoading: true, error: null });
    renderList();

    expect(screen.getByText('Loading organizations...')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Organizations' })).toBeNull();
  });

  it('shows an error message when the organizations cannot be loaded', () => {
    mockOrganizations({ data: undefined, isLoading: false, error: new Error('500') });
    renderList();

    expect(screen.getByText('Error loading organizations')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Organizations' })).toBeNull();
  });

  it('invites to create a first organization when the list is empty', () => {
    mockOrganizations({ data: [], isLoading: false, error: null });
    renderList();

    expect(screen.getByText(/No organizations found/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Add Organization' }).getAttribute('href')).toBe('/organizations/new');
  });

  it('shows the details of an organization, its contact count and its edit link', () => {
    renderList();

    const card = within(cardOf('Isotope SA'));
    expect(card.getByText('Conseil')).toBeTruthy();
    expect(card.getByText('Cabinet de conseil')).toBeTruthy();
    expect(card.getByRole('link', { name: 'https://isotope.example' }).getAttribute('href')).toBe('https://isotope.example');
    expect(card.getByText('2')).toBeTruthy();
    expect(card.getByRole('link', { name: 'Edit' }).getAttribute('href')).toBe('/organizations/org-1/edit');
  });

  it('hides the optional fields and counts no contact when they are missing', () => {
    renderList();

    const card = within(cardOf('Atelier Nord'));
    expect(card.queryByText('Industry:')).toBeNull();
    expect(card.getAllByRole('link')).toHaveLength(1);
    expect(card.getByText('0')).toBeTruthy();
  });

  it('deletes the organization once the user confirms', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    deleteMutation.mutateAsync.mockResolvedValue(undefined);
    renderList();

    fireEvent.click(within(cardOf('Atelier Nord')).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(deleteMutation.mutateAsync).toHaveBeenCalledWith('org-2'));
  });

  it('keeps the organization when the user cancels the confirmation', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderList();

    fireEvent.click(within(cardOf('Atelier Nord')).getByRole('button', { name: 'Delete' }));

    expect(deleteMutation.mutateAsync).not.toHaveBeenCalled();
  });

  it('warns the user when the deletion fails', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    deleteMutation.mutateAsync.mockRejectedValue(new Error('500'));
    renderList();

    fireEvent.click(within(cardOf('Isotope SA')).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(alert).toHaveBeenCalledWith('Failed to delete organization'));
  });
});
