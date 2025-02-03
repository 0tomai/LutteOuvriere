package fr.ul.lutteouvrire;

import android.annotation.SuppressLint;
import android.graphics.Typeface;
import android.os.Bundle;
import android.text.Html;
import android.util.Log;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

import com.bumptech.glide.Glide;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;

import java.io.IOException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class ArticleActivity extends AppCompatActivity {
    private TextView articleContent;
    private ImageView articleImage;
    private ExecutorService executorService;
    private ImageView changeFontButton;
    private boolean isCursive = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_article);

        articleContent = findViewById(R.id.article_content);
        articleImage = findViewById(R.id.article_image);
        executorService = Executors.newSingleThreadExecutor();

        changeFontButton = findViewById(R.id.change_font_button);
        changeFontButton.setOnClickListener(v -> {
            if (isCursive) {
                // Revenir à la police normale (serif)
                articleContent.setTypeface(Typeface.create("serif", Typeface.NORMAL));
            } else {
                // Passer à la police cursive
                articleContent.setTypeface(Typeface.create("cursive", Typeface.NORMAL));
            }
            isCursive = !isCursive;
        });

        String articleLink = getIntent().getStringExtra("article_link");
        Log.d("ArticleActivity", "Article URL : " + articleLink);
        if (articleLink != null) {
            loadArticleContent(articleLink);
        }
    }

    @SuppressLint("SetTextI18n")
    private void loadArticleContent(String url) {
        Log.d("ArticleActivity", "OKOKOK");
        executorService.execute(() -> {
            try {
                Document doc = Jsoup.connect(url).get();

                // Récupérer le contenu HTML de l'article
                Element contentBody = doc.select("div.Content-body").first();
                String contentHtml = contentBody != null ? contentBody.html() : "Contenu non trouvé";

                // Nettoyer le HTML en supprimant les balises <span> et les styles inline
                contentHtml = contentHtml.replaceAll("<span[^>]*>", "").replaceAll("</span>", "");

                // Récupérer l'image dans la balise <figure> avec la classe "Figure"
                Element figureElement = doc.select("figure.Figure").first();
                String imageUrl;
                if (figureElement != null) {
                    // Extraire l'URL de l'image à partir de l'attribut "src" de la balise <img>
                    Element imgElement = figureElement.select("img").first();
                    if (imgElement != null) {
                        imageUrl = imgElement.absUrl("src");  // Récupérer l'URL absolue de l'image
                        Log.d("ArticleActivity", "Image URL : " + imageUrl);
                    } else {
                        imageUrl = null;
                    }
                } else {
                    imageUrl = null;
                }

                // Affichage du contenu HTML dans le TextView
                String finalContentHtml = contentHtml;
                runOnUiThread(() -> {
                    // Convertir le HTML en texte formaté avec des retours à la ligne
                    articleContent.setText(Html.fromHtml(finalContentHtml, Html.FROM_HTML_MODE_COMPACT));
                });

                // Affichage de l'image si elle existe
                if (imageUrl != null && !imageUrl.isEmpty()) {
                    runOnUiThread(() -> {
                        articleImage.setVisibility(ImageView.VISIBLE);  // Afficher l'image
                        Glide.with(ArticleActivity.this)
                                .load(imageUrl)
                                .into(articleImage);
                    });
                } else {
                    runOnUiThread(() -> articleImage.setVisibility(ImageView.GONE));  // Masquer l'image si aucune URL
                }

            } catch (IOException e) {
                runOnUiThread(() -> articleContent.setText("Erreur de chargement"));
            }
        });
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        executorService.shutdown();
    }
}