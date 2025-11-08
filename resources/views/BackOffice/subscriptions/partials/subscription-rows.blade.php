@forelse($subscriptions as $subscription)
<tr>
    <td><strong>{{ $subscription->name }}</strong></td>
    <td>{{ number_format($subscription->price, 2) }} €</td>
    <td>{{ $subscription->duration_days }} days</td>
    <td>
        <span class="badge bg-info">{{ count($subscription->features) }} features</span>
    </td>
    <td>
        <span class="badge bg-{{ $subscription->is_active ? 'success' : 'danger' }}">
            {{ $subscription->is_active ? 'Active' : 'Inactive' }}
        </span>
    </td>
    <td>
        <div class="dropdown">
            <button type="button" class="btn p-0 dropdown-toggle hide-arrow" data-bs-toggle="dropdown">
                <i class="bx bx-dots-vertical-rounded"></i>
            </button>
            <div class="dropdown-menu">
                <a class="dropdown-item" href="{{ route('subscriptions.edit', $subscription) }}">
                    <i class="bx bx-edit-alt me-1"></i> Edit
                </a>
                <form action="{{ route('subscriptions.destroy', $subscription) }}" method="POST" 
                      onsubmit="return confirm('Are you sure?')" style="display: inline;">
                    @csrf
                    @method('DELETE')
                    <button type="submit" class="dropdown-item text-danger">
                        <i class="bx bx-trash me-1"></i> Delete
                    </button>
                </form>
            </div>
        </div>
    </td>
</tr>
@empty
<tr>
    <td colspan="6" class="text-center py-4">
        <i class="bx bx-credit-card bx-lg mb-2"></i>
        <p>No subscriptions found</p>
    </td>
</tr>
@endforelse
