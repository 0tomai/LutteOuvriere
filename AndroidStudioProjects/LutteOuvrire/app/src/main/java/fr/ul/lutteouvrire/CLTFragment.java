package fr.ul.lutteouvrire;

import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.EditText;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import java.util.ArrayList;
import java.util.List;

public class CLTFragment extends Fragment {

    private RecyclerView recyclerView;
    private ArticleAdapter adapter;
    private EditText searchEditText;
    private List<Article> allArticles = new ArrayList<>();
    private List<Article> filteredArticles = new ArrayList<>();

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        Log.i("CLTFragment", "Création du fragment CLT");

        View view = inflater.inflate(R.layout.fragment_clt, container, false);

        searchEditText = view.findViewById(R.id.search_edit_text);
        recyclerView = view.findViewById(R.id.recyclerView);
        recyclerView.setLayoutManager(new LinearLayoutManager(getContext()));

        // Configuration de la recherche
        searchEditText.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                filterArticles(s.toString());
            }

            @Override
            public void afterTextChanged(Editable s) {}
        });

        // Chargement des articles CLT
        new WebScraper.ScrapeCLTAsyncTask(new WebScraper.ScrapeCLTAsyncTask.OnScrapeCompleteListener() {
            @Override
            public void onScrapeComplete(List<Article> articles) {
                allArticles = new ArrayList<>(articles);
                filteredArticles = new ArrayList<>(articles);
                adapter = new ArticleAdapter(getContext(), filteredArticles);
                recyclerView.setAdapter(adapter);
                Log.i("CLTFragment", "Conférences CLT chargées : " + articles.size());
            }
        }).execute();

        return view;
    }

    private void filterArticles(String query) {
        filteredArticles.clear();

        if (query.isEmpty()) {
            filteredArticles.addAll(allArticles);
        } else {
            String lowerQuery = query.toLowerCase();

            // Recherche par pertinence
            List<Article> exactMatches = new ArrayList<>();
            List<Article> titleMatches = new ArrayList<>();
            List<Article> numberMatches = new ArrayList<>();
            List<Article> partialMatches = new ArrayList<>();

            for (Article article : allArticles) {
                String title = article.getTitle().toLowerCase();
                String teaser = article.getTeaser().toLowerCase(); // Contient le numéro

                // Correspondance exacte avec le numéro
                if (teaser.equals("n°" + lowerQuery) || teaser.equals("numéro " + lowerQuery)) {
                    exactMatches.add(article);
                }
                // Correspondance exacte avec le titre
                else if (title.equals(lowerQuery)) {
                    exactMatches.add(article);
                }
                // Le titre commence par la requête
                else if (title.startsWith(lowerQuery)) {
                    titleMatches.add(article);
                }
                // Le numéro contient la requête
                else if (teaser.contains(lowerQuery)) {
                    numberMatches.add(article);
                }
                // Le titre contient la requête
                else if (title.contains(lowerQuery)) {
                    partialMatches.add(article);
                }
            }

            // Ajouter les résultats par ordre de pertinence
            filteredArticles.addAll(exactMatches);
            filteredArticles.addAll(titleMatches);
            filteredArticles.addAll(numberMatches);
            filteredArticles.addAll(partialMatches);
        }

        if (adapter != null) {
            adapter.notifyDataSetChanged();
        }
    }
}