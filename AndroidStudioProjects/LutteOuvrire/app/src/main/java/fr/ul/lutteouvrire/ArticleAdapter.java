package fr.ul.lutteouvrire;

import android.content.Context;
import android.content.Intent;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import java.util.List;


public class ArticleAdapter extends RecyclerView.Adapter<ArticleAdapter.ViewHolder> {
    private final List<Article> articles;
    private final Context context;

    public ArticleAdapter(Context context, List<Article> articles) {
        this.articles = articles;
        this.context = context;
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_article, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        Article article = articles.get(position);
        holder.title.setText(article.getTitle());
        holder.teaser.setText(article.getTeaser());
        holder.date.setText(article.getDate());

        holder.itemView.setOnClickListener(v -> {
            Intent intent = new Intent(context, ArticleActivity.class);
            intent.putExtra("article_link", article.getLink());
            intent.putExtra("article_title", article.getTitle()); // Ajouter le titre
            context.startActivity(intent);
        });
    }

    @Override
    public int getItemCount() {
        return articles.size();
    }

    public static class ViewHolder extends RecyclerView.ViewHolder {
        TextView title, teaser, date;

        public ViewHolder(@NonNull View itemView) {
            super(itemView);
            title = itemView.findViewById(R.id.title);
            teaser = itemView.findViewById(R.id.teaser);
            date = itemView.findViewById(R.id.article_date);
        }
    }
}