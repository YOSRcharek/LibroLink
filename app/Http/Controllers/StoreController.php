<?php

namespace App\Http\Controllers;

use App\Models\Store;
use App\Models\Livre;
use Illuminate\Http\Request;


class StoreController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
    $allBooks = Livre::all();

// use a subquery to compute total_books_quantity so we avoid GROUP BY issues
    $stores = Store::select(
            'stores.*',
            \DB::raw('(SELECT COALESCE(SUM(quantity), 0) FROM livre_store WHERE livre_store.store_id = stores.id) as total_books_quantity')
        )
        ->get()
        ->map(function ($store) {
            // ensure created_at is Carbon instance for the blade formatting
            if (isset($store->created_at) && ! $store->created_at instanceof \Illuminate\Support\Carbon) {
                $store->created_at = \Illuminate\Support\Carbon::parse($store->created_at);
            }
            return $store;
        });
        return view('BackOffice.magasin.listeMagasin', compact('stores', 'allBooks'));
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        $allBooks = Livre::all();
        return view('BackOffice.magasin.ajouterMagasin', compact('allBooks'));
    }

    /**
     * Store a newly created resource in storage.
     */
   public function store(Request $request)
{
    $request->validate([
        'store_name' => 'required|string|max:255',
        'owner_name' => 'nullable|string|max:255',
        'location'   => 'required|string|max:255',
        'contact'    => 'nullable|string|max:255',
        'store_image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:20048',
    ]);

    // Enregistrement de l'image
    $storeImage = $request->hasFile('store_image')
        ? $request->file('store_image')->store('stores', 'public')
        : null;

    // Création du store
    $store = Store::create([
        'store_name' => $request->store_name,
        'owner_name' => $request->owner_name,
        'location'   => $request->location,
        'contact'    => $request->contact,
        'store_image' => $storeImage,
    ]);

    // ATTACH des livres avec quantités (pivot)
    $books = $request->input('books', []);
    $syncData = [];

    foreach ($books as $b) {
        if (!empty($b['id'])) {
            $syncData[$b['id']] = ['quantity' => intval($b['quantity'] ?? 0)];
        }
    }

    if (!empty($syncData)) {
        $store->livres()->sync($syncData);  // ⬅️ ICI l’attachement pivot
    }

    return redirect()->route('listeMagasin')->with('success', 'Store added successfully!');
}


    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        // load store with reviews and related books (including pivot.quantity) and count
        $store = Store::with(['reviews.user', 'livres'])->withCount('livres')->findOrFail($id);

        $averageRating = round($store->averageRating(), 1);

    return view('FrontOffice.Stores.Show', compact('store', 'averageRating'));
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id)
    {
        // $store = Store::findOrFail($id);
        $store = Store::with('livres')->findOrFail($id); // eager load books
        $allBooks = Livre::all(); // get all existing books
        return view('BackOffice.magasin.ajouterMagasin', compact('store', 'allBooks'));
    }

    /**
     * Update the specified resource in storage.
     */
  public function update(Request $request, string $id)
{
    $request->validate([
        'store_name' => 'required|string|max:255',
        'owner_name' => 'nullable|string|max:255',
        'location'   => 'required|string|max:255',
        'contact'    => 'nullable|string|max:255',
        'store_image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:20048',
    ]);

    $store = Store::findOrFail($id);

    // Récupérer les champs à mettre à jour
    $data = $request->only(['store_name', 'owner_name', 'location', 'contact']);

    // Si une nouvelle image est uploadée
    if ($request->hasFile('store_image')) {
        // Supprimer l'ancienne image si elle existe
        if ($store->store_image && \Storage::disk('public')->exists($store->store_image)) {
            \Storage::disk('public')->delete($store->store_image);
        }

        // Stocker la nouvelle image
        $data['store_image'] = $request->file('store_image')->store('stores', 'public');
    }

    $store->update($data);
            // sync books pivot (overwrite existing)
        $books = $request->input('books', []);
        $syncData = [];
        foreach ($books as $b) {
            if (empty($b['id'])) continue;
            $qty = isset($b['quantity']) ? intval($b['quantity']) : 0;
            $syncData[$b['id']] = ['quantity' => $qty];
        }
        $store->livres()->sync($syncData);


    return redirect()->route('listeMagasin')->with('success', 'Item mis à jour avec succès !');
}


    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $store = Store::findOrFail($id);
        $store->delete();

        return redirect()->route('listeMagasin')->with('success', 'Item supprimé avec succès !');
    }

public function indexFront(Request $request)
{
    // Start a query builder
    $query = Store::query();

    // Filter by store name if provided
    if ($request->filled('name')) {
        $query->where('store_name', 'like', '%' . $request->name . '%');
    }

    // Filter by owner name if provided
    if ($request->filled('owner_name')) {
        $query->where('owner_name', 'like', '%' . $request->owner_name . '%');
    }

    // Execute the query and get the results
    $stores = $query->get();

    // Load stores with their books count
    $stores = Store::withCount('livres')->get();
    //$store = Store::withCount('livres')->with('reviews.user')->findOrFail($id);
    $allBooks = Livre::all(); // get all existing books
    return view('FrontOffice.Stores.StorePage', compact('stores'));



    // return view('FrontOffice.Stores.StorePage', compact('stores'));
}

    
}