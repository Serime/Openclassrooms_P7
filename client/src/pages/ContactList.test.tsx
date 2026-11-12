import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ContactList from './ContactList';
import { useContacts, useDeleteContact } from '../hooks/useContacts';

vi.mock('../hooks/useContacts', () => ({
  useContacts: vi.fn(),
  useDeleteContact: vi.fn(),
}));

const deleteMutation = { mutateAsync: vi.fn() };

const contacts = [
  {
    id: 'c-1',
    firstName: 'Maria',
    lastName: 'Durand',
    email: 'maria@example.org',
    phone: '0102030405',
    position: 'Directrice',
    organization: { id: 'org-1', name: 'Isotope SA' },
  },
  { id: 'c-2', firstName: 'Paul', lastName: 'Martin', email: 'paul@example.org' },
];

function mockContacts(result: object) {
  vi.mocked(useContacts).mockReturnValue(result as unknown as ReturnType<typeof useContacts>);
}

function renderList() {
  render(
    <MemoryRouter>
      <ContactList />
    </MemoryRouter>,
  );
}

function rowOf(name: string) {
  return screen.getByText(name).closest('tr') as HTMLElement;
}

describe('ContactList', () => {
  beforeEach(() => {
    vi.mocked(useDeleteContact).mockReturnValue(deleteMutation as unknown as ReturnType<typeof useDeleteContact>);
    deleteMutation.mutateAsync.mockReset();
    mockContacts({ data: contacts, isLoading: false, error: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows a loading message while the contacts are fetched', () => {
    mockContacts({ data: undefined, isLoading: true, error: null });
    renderList();

    expect(screen.getByText('Loading contacts...')).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('shows an error message when the contacts cannot be loaded', () => {
    mockContacts({ data: undefined, isLoading: false, error: new Error('500') });
    renderList();

    expect(screen.getByText('Error loading contacts')).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('invites to create a first contact when the list is empty', () => {
    mockContacts({ data: [], isLoading: false, error: null });
    renderList();

    expect(screen.getByText(/No contacts found/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Add Contact' }).getAttribute('href')).toBe('/contacts/new');
  });

  it('lists each contact with its details and a link to its edit form', () => {
    renderList();

    const maria = within(rowOf('Maria Durand'));
    expect(maria.getByText('Directrice')).toBeTruthy();
    expect(maria.getByText('maria@example.org')).toBeTruthy();
    expect(maria.getByText('0102030405')).toBeTruthy();
    expect(maria.getByText('Isotope SA')).toBeTruthy();
    expect(maria.getByRole('link', { name: 'Edit' }).getAttribute('href')).toBe('/contacts/c-1/edit');
  });

  it('shows a dash for a missing phone and a missing organization', () => {
    renderList();

    expect(within(rowOf('Paul Martin')).getAllByText('-')).toHaveLength(2);
  });

  it('deletes the contact once the user confirms', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    deleteMutation.mutateAsync.mockResolvedValue(undefined);
    renderList();

    fireEvent.click(within(rowOf('Paul Martin')).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(deleteMutation.mutateAsync).toHaveBeenCalledWith('c-2'));
  });

  it('keeps the contact when the user cancels the confirmation', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderList();

    fireEvent.click(within(rowOf('Paul Martin')).getByRole('button', { name: 'Delete' }));

    expect(deleteMutation.mutateAsync).not.toHaveBeenCalled();
  });

  it('warns the user when the deletion fails', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    deleteMutation.mutateAsync.mockRejectedValue(new Error('500'));
    renderList();

    fireEvent.click(within(rowOf('Maria Durand')).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(alert).toHaveBeenCalledWith('Failed to delete contact'));
  });
});
