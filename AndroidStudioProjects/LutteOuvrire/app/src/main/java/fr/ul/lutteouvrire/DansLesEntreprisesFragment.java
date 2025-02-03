package fr.ul.lutteouvrire;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import java.util.List;

public class DansLesEntreprisesFragment extends Fragment {

    private RecyclerView recyclerView;
    private ArticleAdapter adapter;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.fragment_a_la_une, container, false);

        recyclerView = view.findViewById(R.id.recyclerView);
        recyclerView.setLayoutManager(new LinearLayoutManager(getContext()));

        new WebScraper.ScrapeAsyncTask() {
            @Override
            protected void onPostExecute(List<Article> articles) {
                super.onPostExecute(articles);
                adapter = new ArticleAdapter(getContext(), articles);
                recyclerView.setAdapter(adapter);
            }
        }.execute("block_dans-les-entreprises");

        return view;
    }
}
