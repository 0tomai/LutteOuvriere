package fr.ul.lutteouvrire;

import android.os.Bundle;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import java.util.List;

public class MensuelFragment extends Fragment {

    private RecyclerView recyclerView;
    private ArticleAdapter adapter;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        Log.i("MensuelFragment", "après la création");

        View view = inflater.inflate(R.layout.ldc, container, false);

        recyclerView = view.findViewById(R.id.recyclerView);
        recyclerView.setLayoutManager(new LinearLayoutManager(getContext()));

        new WebScraper.ScrapeMensuelAsyncTask(new WebScraper.ScrapeMensuelAsyncTask.OnScrapeCompleteListener() {
            @Override
            public void onScrapeComplete(List<Article> articles) {
                adapter = new ArticleAdapter(getContext(), articles);
                recyclerView.setAdapter(adapter);
                Log.i("MensuelFragment", "Articles chargés : " + articles.size());
            }
        }).execute();

        return view;
    }
}