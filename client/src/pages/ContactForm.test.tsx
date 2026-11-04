import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ContactForm from './ContactForm';
import { useContact, useCreateContact, useUpdateContact } from '../hooks/useContacts';
import { useOrganizations } from '../hooks/useOrganizations';

vi.mock('../hooks/useContacts', () => ({
  useContact: vi.fn(),
  useCreateContact: vi.fn(),
  useUpdateContact: vi.fn(),
}));

vi.mock('../hooks/useOrganizations', () => ({
  useOrganizations: vi.fn(),
}));

const createMutation = { mutateAsync: vi.fn(), isPending: false };
const updateMutation = { mutateAsync: vi.fn(), isPending: false };

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/contacts" element={<p>Liste des contacts</p>} />
        <Route path="/contacts/new" element={<ContactForm />} />
        <Route path="/contacts/:id/edit" element={<ContactForm />} />
      </Routes>
    </MemoryRouter>,
  );
}

function fill(label: RegExp, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

describe('ContactForm', () => {
  beforeEach(() => {
    vi.mocked(useContact).mockReturnValue({ data: undefined, isLoading: false } as unknown as ReturnType<typeof useContact>);
    vi.mocked(useCreateContact).mockReturnValue(createMutation as unknown as ReturnType<typeof useCreateContact>);
    vi.mocked(useUpdateContact).mockReturnValue(updateMutation as unknown as ReturnType<typeof useUpdateContact>);
    vi.mocked(useOrganizations).mockReturnValue({
      data: [{ id: 'org-1', name: 'Isotope SA' }],
    } as unknown as ReturnType<typeof useOrganizations>);
    createMutation.mutateAsync.mockReset();
    updateMutation.mutateAsync.mockReset();
  });

  it('creates a contact with the entered values and returns to the list', async () => {
    createMutation.mutateAsync.mockResolvedValue({});
    renderAt('/contacts/new');

    fill(/first name/i, 'Maria');
    fill(/last name/i, 'Durand');
    fill(/email/i, 'maria@example.org');
    fill(/organization/i, 'org-1');
    fireEvent.click(screen.getByRole('button', { name: 'Create Contact' }));

    await screen.findByText('Liste des contacts');
    expect(createMutation.mutateAsync).toHaveBeenCalledWith({
      firstName: 'Maria',
      lastName: 'Durand',
      email: 'maria@example.org',
      phone: undefined,
      position: undefined,
      organizationId: 'org-1',
    });
  });

  it('shows an error and stays on the form when saving fails', async () => {
    createMutation.mutateAsync.mockRejectedValue(new Error('409'));
    renderAt('/contacts/new');

    fill(/first name/i, 'Maria');
    fill(/last name/i, 'Durand');
    fill(/email/i, 'maria@example.org');
    fireEvent.click(screen.getByRole('button', { name: 'Create Contact' }));

    expect(await screen.findByText('Failed to save contact. Please try again.')).toBeTruthy();
    expect(screen.queryByText('Liste des contacts')).toBeNull();
  });

  it('prefills the form in edit mode and updates the contact', async () => {
    vi.mocked(useContact).mockReturnValue({
      data: { id: 'c-1', firstName: 'Maria', lastName: 'Durand', email: 'maria@example.org', phone: null, position: 'CTO', organizationId: null },
      isLoading: false,
    } as unknown as ReturnType<typeof useContact>);
    updateMutation.mutateAsync.mockResolvedValue({});
    renderAt('/contacts/c-1/edit');

    await waitFor(() => expect((screen.getByLabelText(/position/i) as HTMLInputElement).value).toBe('CTO'));
    fill(/phone/i, '0102030405');
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await screen.findByText('Liste des contacts');
    expect(updateMutation.mutateAsync).toHaveBeenCalledWith({
      id: 'c-1',
      input: expect.objectContaining({ email: 'maria@example.org', phone: '0102030405', position: 'CTO' }),
    });
  });

  it('shows a loading message while the contact is fetched', () => {
    vi.mocked(useContact).mockReturnValue({ data: undefined, isLoading: true } as unknown as ReturnType<typeof useContact>);
    renderAt('/contacts/c-1/edit');

    expect(screen.getByText('Loading contact...')).toBeTruthy();
  });

  it('goes back to the list when cancelling', async () => {
    renderAt('/contacts/new');

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(await screen.findByText('Liste des contacts')).toBeTruthy();
  });
});
