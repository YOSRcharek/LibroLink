@extends('baseB')
@section('content')

<div class="container-xxl flex-grow-1 container-p-y">
    <div class="d-flex justify-content-between align-items-center py-3 mb-4">
        <h4 class="fw-bold"><span class="text-muted fw-light">Payments /</span> Subscriptions</h4>
        <a href="{{ route('subscriptions.create') }}" class="btn btn-primary">
            <i class="bx bx-plus me-1"></i>Add Subscription
        </a>
    </div>

    @if(session('success'))
        <div class="alert alert-success alert-dismissible fade show" role="alert">
            {{ session('success') }}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    @endif

    <div class="card mb-4">
        <div class="card-body">
            <div class="search-form">
                <div class="row align-items-end">
                    <div class="col-md-6">
                        <input type="text" id="searchInput" name="search" value="{{ request('search') }}" 
                               placeholder="Search for a subscription..." class="form-control">
                    </div>
                    <div class="col-md-6">
                        <select id="statusFilter" name="status" class="form-select">
                            <option value="">All statuses</option>
                            <option value="active" {{ request('status') == 'active' ? 'selected' : '' }}>Active</option>
                            <option value="inactive" {{ request('status') == 'inactive' ? 'selected' : '' }}>Inactive</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="card">
        <h5 class="card-header">Subscriptions</h5>
        <div class="table-responsive text-nowrap">
            <table class="table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Price</th>
                        <th>Duration</th>
                        <th>Features</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="subscriptionTableBody">
                    @include('BackOffice.subscriptions.partials.subscription-rows')
                </tbody>
            </table>
        </div>
        
        <!-- Pagination -->
        <div id="paginationContainer">
            @if($subscriptions->hasPages())
                <div class="card-footer">
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="text-muted small">
                            Showing {{ $subscriptions->firstItem() }} to {{ $subscriptions->lastItem() }} of {{ $subscriptions->total() }} subscriptions
                        </div>
                        <nav>
                            {{ $subscriptions->links('pagination::bootstrap-5') }}
                        </nav>
                    </div>
                </div>
            @endif
        </div>
    </div>
</div>

<script>
// Activer les tooltips Bootstrap
var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
  return new bootstrap.Tooltip(tooltipTriggerEl)
})

// Recherche en temps réel
let searchTimeout;
const searchInput = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');

function performSearch() {
    const searchValue = searchInput.value;
    const statusValue = statusFilter.value;
    
    // Si le champ de recherche est vide et aucun filtre de statut, recharger la page pour afficher toutes les subscriptions
    if (searchValue === '' && statusValue === '') {
        window.location.href = '{{ route("subscriptions.index") }}';
        return;
    }
    
    // Effectuer la recherche AJAX
    fetch('{{ route("subscriptions.search") }}?' + new URLSearchParams({
        search: searchValue,
        status: statusValue
    }), {
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        // Mettre à jour le tableau
        document.getElementById('subscriptionTableBody').innerHTML = data.html;
        
        // Cacher la pagination pendant la recherche
        document.getElementById('paginationContainer').style.display = 'none';
    })
    .catch(error => {
        console.error('Erreur lors de la recherche:', error);
    });
}

// Événement sur le champ de recherche (avec debounce)
searchInput.addEventListener('input', function() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(performSearch, 300); // Attendre 300ms après la dernière frappe
});

// Événement sur le filtre de statut
statusFilter.addEventListener('change', performSearch);
</script>

@endsection