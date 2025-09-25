package fr.ul.lutteouvrire;

import android.annotation.SuppressLint;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Rect;
import android.graphics.Typeface;
import android.graphics.drawable.Drawable;
import android.net.Uri;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.text.Html;
import android.text.Layout;
import android.text.StaticLayout;
import android.text.TextPaint;
import android.util.Log;
import android.view.View; // Ajouté pour View.GONE/VISIBLE
import android.widget.ImageButton;
import android.widget.ImageView;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.FileProvider;

import com.bumptech.glide.Glide;
import com.bumptech.glide.request.target.CustomTarget;
import com.bumptech.glide.request.transition.Transition;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class ArticleActivity extends AppCompatActivity {
    private TextView articleContent;
    private ImageView articleImage;
    private ScrollView scrollView;
    private ImageButton shareButton;
    private ExecutorService executorService;
    private boolean isCursive = false;

    private SharedPreferences sharedPreferences;
    private String articleUrl;
    private String articleTitle;
    private String articleText;
    private String imageUrl; // Déclaré mais non initialisé pour l'instant

    private TextToSpeech tts;
    private ImageButton playPauseButton;
    private boolean isPlaying = false;

    private static final String PREFS_NAME = "ArticleReadingPrefs";
    private static final String SCROLL_POSITION_PREFIX = "scroll_position_";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_article);

        articleContent = findViewById(R.id.article_content);
        articleImage = findViewById(R.id.article_image);
        scrollView = findViewById(R.id.scrollView);
        shareButton = findViewById(R.id.share_button);
        playPauseButton = findViewById(R.id.play_pause_button); // <--- Vérifie bien que cet ID existe dans activity_article.xml
        executorService = Executors.newSingleThreadExecutor();

        sharedPreferences = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);

        ImageView changeFontButton = findViewById(R.id.change_font_button);
        if (changeFontButton != null) { // Ajout d'une vérification nulle
            changeFontButton.setOnClickListener(v -> {
                if (isCursive) {
                    articleContent.setTypeface(Typeface.create("serif", Typeface.NORMAL));
                } else {
                    articleContent.setTypeface(Typeface.create("cursive", Typeface.NORMAL));
                }
                isCursive = !isCursive;
            });
        }


        if (shareButton != null) { // Ajout d'une vérification nulle
            shareButton.setOnClickListener(v -> generateAndShareImage());
        }


        // --- Initialisation de TextToSpeech ---
        // S'assurer que le bouton existe avant d'ajouter le listener ou de le rendre visible
        if (playPauseButton != null) {
            tts = new TextToSpeech(this, status -> {
                if (status == TextToSpeech.SUCCESS) {
                    int result = tts.setLanguage(Locale.FRENCH);
                    if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
                        Log.e("TTS", "Langue non supportée ou données manquantes pour la synthèse vocale.");
                        runOnUiThread(() -> {
                            Toast.makeText(ArticleActivity.this, "Langue TTS non supportée. La lecture audio n'est pas disponible.", Toast.LENGTH_LONG).show();
                            playPauseButton.setVisibility(View.GONE);
                        });
                    } else {
                        runOnUiThread(() -> {
                            playPauseButton.setVisibility(View.VISIBLE); // Rendre le bouton visible une fois TTS prêt
                            Log.d("TTS", "TextToSpeech initialisé et prêt.");
                        });
                    }
                } else {
                    Log.e("TTS", "Échec de l'initialisation de la synthèse vocale. Status: " + status);
                    runOnUiThread(() -> {
                        Toast.makeText(ArticleActivity.this, "Initialisation TTS échouée. La lecture audio n'est pas disponible.", Toast.LENGTH_LONG).show();
                        playPauseButton.setVisibility(View.GONE);
                    });
                }
            });

            playPauseButton.setOnClickListener(v -> {
                if (articleText == null || articleText.trim().isEmpty()) {
                    Toast.makeText(this, "Contenu de l'article non chargé pour la lecture.", Toast.LENGTH_SHORT).show();
                    return;
                }
                if (isPlaying) {
                    pauseArticle();
                } else {
                    readArticle();
                }
            });
            playPauseButton.setVisibility(View.GONE); // Toujours cacher le bouton par défaut jusqu'à initialisation TTS
        } else {
            Log.e("ArticleActivity", "Le bouton play_pause_button n'a pas été trouvé dans le layout !");
            // Ici, vous pourriez désactiver la fonctionnalité TTS complètement
        }


        articleUrl = getIntent().getStringExtra("article_link");
        articleTitle = getIntent().getStringExtra("article_title");

        Log.d("ArticleActivity", "Article URL : " + articleUrl);
        if (articleUrl != null) {
            loadArticleContent(articleUrl);
        } else {
            Toast.makeText(this, "URL de l'article non fournie.", Toast.LENGTH_SHORT).show();
            finish(); // Ferme l'activité si pas d'URL
        }
    }

    private void readArticle() {
        if (tts == null || !isPlaying && !tts.isSpeaking() && tts.getEngines().isEmpty()) { // Vérification plus robuste
            Toast.makeText(this, "La synthèse vocale n'est pas disponible ou prête.", Toast.LENGTH_SHORT).show();
            return;
        }

        String textToSpeak = (articleTitle != null ? articleTitle + ". " : "") +
                (articleText != null ? articleText : "");

        if (textToSpeak.trim().isEmpty()) {
            Toast.makeText(this, "Article vide pour la lecture audio.", Toast.LENGTH_SHORT).show();
            return;
        }

        textToSpeak = textToSpeak.replaceAll("(\\r?\\n)+", " "); // Remplacer les sauts de ligne multiples par un espace

        // Utilisation de TextToSpeech.Engine.KEY_PARAM_UTTERANCE_ID pour suivre la lecture
        tts.speak(textToSpeak, TextToSpeech.QUEUE_FLUSH, null, "article_utterance");
        isPlaying = true;
        if (playPauseButton != null) {
            playPauseButton.setImageResource(android.R.drawable.ic_media_pause);
        }
        Toast.makeText(this, "Lecture audio démarrée.", Toast.LENGTH_SHORT).show();
    }

    private void pauseArticle() {
        if (tts != null && tts.isSpeaking()) {
            tts.stop();
            isPlaying = false;
            if (playPauseButton != null) {
                playPauseButton.setImageResource(android.R.drawable.ic_media_play);
            }
            Toast.makeText(this, "Lecture audio mise en pause.", Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        saveScrollPosition();
        if (tts != null && tts.isSpeaking()) { // Arrêter la lecture si l'activité est mise en pause
            tts.stop();
            isPlaying = false;
            if (playPauseButton != null) {
                playPauseButton.setImageResource(android.R.drawable.ic_media_play);
            }
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        saveScrollPosition(); // Sauvegarde finale
        if (tts != null) {
            tts.stop(); // Arrête toute lecture en cours
            tts.shutdown(); // Libère les ressources du TTS
            Log.d("TTS", "TextToSpeech shutdown.");
        }
        if (executorService != null && !executorService.isShutdown()) {
            executorService.shutdown();
            Log.d("Executor", "ExecutorService shutdown.");
        }
    }


    @SuppressLint("SetTextI18n")
    private void loadArticleContent(String url) {
        executorService.execute(() -> {
            try {
                Document doc = Jsoup.connect(url).get();

                // Récupérer le titre si pas déjà fourni
                if (articleTitle == null || articleTitle.isEmpty()) {
                    Element titleElement = doc.select("h1").first();
                    articleTitle = titleElement != null ? titleElement.text() : "Article sans titre";
                }

                // Récupérer le contenu HTML de l'article
                Element contentBody = doc.select("div.Content-body").first();
                String contentHtml = "";
                if (contentBody != null) {
                    contentHtml = contentBody.html();
                    // Logique pour trouver l'image principale dans le contenu de l'article
                    Element imageElement = contentBody.select("img").first();
                    if (imageElement != null) {
                        imageUrl = imageElement.absUrl("src");
                        // Optionnel: supprimer l'image du HTML pour éviter la duplication si elle est déjà affichée par articleImage
                        imageElement.remove();
                    }
                } else {
                    contentHtml = "Contenu de l'article non trouvé.";
                }

                // Nettoyer le HTML : retirer les span, p, div, etc., mais garder le texte
                // Utilisez Jsoup pour une extraction plus propre si nécessaire
                Document parsedContent = Jsoup.parse(contentHtml);
                articleText = parsedContent.text(); // Extrait le texte brut de l'HTML

                // Nettoyer le HTML pour l'affichage (si des balises spécifiques doivent être retirées)
                // Assurez-vous que le HTML final pour TextView est valide pour Html.fromHtml
                String finalContentHtml = contentHtml.replaceAll("<span[^>]*>", "").replaceAll("</span>", "");
                // Vous pouvez ajouter d'autres remplacements ici si des balises causent des problèmes d'affichage ou de lecture


                runOnUiThread(() -> {
                    articleContent.setText(Html.fromHtml(finalContentHtml, Html.FROM_HTML_MODE_COMPACT));
                    restoreScrollPosition();

                    // Affichage de l'image
                    if (imageUrl != null && !imageUrl.isEmpty()) {
                        articleImage.setVisibility(ImageView.VISIBLE);
                        Glide.with(ArticleActivity.this)
                                .load(imageUrl)
                                .into(new CustomTarget<Drawable>() {
                                    @Override
                                    public void onResourceReady(@NonNull Drawable resource, @Nullable Transition<? super Drawable> transition) {
                                        articleImage.setImageDrawable(resource);
                                    }

                                    @Override
                                    public void onLoadCleared(@Nullable Drawable placeholder) {
                                        // Optionnel: ce qui se passe si le chargement est annulé
                                    }
                                });
                    } else {
                        articleImage.setVisibility(ImageView.GONE);
                    }
                    Log.d("ArticleActivity", "Article chargé et affiché.");
                });

            } catch (IOException e) {
                Log.e("ArticleActivity", "Erreur de chargement de l'article: " + e.getMessage());
                runOnUiThread(() -> {
                    articleContent.setText("Erreur de chargement de l'article. Veuillez vérifier votre connexion.");
                    Toast.makeText(ArticleActivity.this, "Erreur de chargement: " + e.getMessage(), Toast.LENGTH_LONG).show();
                    // Optionnel: Cacher le bouton TTS si le contenu ne peut pas être chargé
                    if (playPauseButton != null) playPauseButton.setVisibility(View.GONE);
                });
            } catch (Exception e) { // Capture d'autres exceptions inattendues
                Log.e("ArticleActivity", "Une erreur inattendue est survenue: " + e.getMessage(), e);
                runOnUiThread(() -> {
                    Toast.makeText(ArticleActivity.this, "Une erreur inattendue est survenue.", Toast.LENGTH_LONG).show();
                    if (playPauseButton != null) playPauseButton.setVisibility(View.GONE);
                });
            }
        });
    }


    // Méthodes existantes inchangées (saveScrollPosition, restoreScrollPosition, getUrlKey, generateAndShareImage)
    private void saveScrollPosition() {
        if (scrollView != null && articleUrl != null) {
            int scrollY = scrollView.getScrollY();
            SharedPreferences.Editor editor = sharedPreferences.edit();
            editor.putInt(SCROLL_POSITION_PREFIX + getUrlKey(articleUrl), scrollY);
            editor.apply();
            Log.d("ArticleActivity", "Position sauvegardée : " + scrollY + " pour l'URL : " + articleUrl);
        }
    }

    private void restoreScrollPosition() {
        if (scrollView != null && articleUrl != null) {
            int savedScrollY = sharedPreferences.getInt(SCROLL_POSITION_PREFIX + getUrlKey(articleUrl), 0);
            if (savedScrollY > 0) {
                scrollView.post(() -> {
                    scrollView.scrollTo(0, savedScrollY);
                    Log.d("ArticleActivity", "Position restaurée : " + savedScrollY + " pour l'URL : " + articleUrl);
                });
            }
        }
    }

    private String getUrlKey(String url) {
        return url.replaceAll("[^a-zA-Z0-9]", "_");
    }

    private void generateAndShareImage() {
        // Cette méthode devrait être révisée pour capturer l'ensemble du ScrollView
        // C'est un code générique, il faudra peut-être l'adapter si le contenu est trop grand
        Toast.makeText(this, "Génération de l'image pour le partage...", Toast.LENGTH_SHORT).show();

        // Récupérer la hauteur totale du contenu du ScrollView
        int totalHeight = scrollView.getChildAt(0).getHeight();
        int totalWidth = scrollView.getChildAt(0).getWidth();

        Bitmap bitmap = Bitmap.createBitmap(totalWidth, totalHeight, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);

        // Dessiner le fond (couleur foncée comme le background)
        canvas.drawColor(Color.BLACK); // Utiliser la couleur de fond de votre ScrollView

        // Dessiner le contenu du ScrollView
        scrollView.draw(canvas);

        try {
            File cachePath = new File(getCacheDir(), "images");
            cachePath.mkdirs(); // Crée le dossier si inexistant
            File file = new File(cachePath, "shared_article.png");
            FileOutputStream fOut = new FileOutputStream(file);
            bitmap.compress(Bitmap.CompressFormat.PNG, 100, fOut);
            fOut.flush();
            fOut.close();

            Uri contentUri = FileProvider.getUriForFile(getApplicationContext(), getApplicationContext().getPackageName() + ".fileprovider", file);

            if (contentUri != null) {
                Intent shareIntent = new Intent(Intent.ACTION_SEND);
                shareIntent.setType("image/png");
                shareIntent.putExtra(Intent.EXTRA_STREAM, contentUri);
                shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                startActivity(Intent.createChooser(shareIntent, "Partager l'article via"));
            } else {
                Toast.makeText(this, "Erreur lors de la préparation du partage.", Toast.LENGTH_SHORT).show();
            }
        } catch (IOException e) {
            Log.e("Share", "Erreur de partage: " + e.getMessage());
            Toast.makeText(this, "Erreur lors du partage de l'article.", Toast.LENGTH_SHORT).show();
        }
    }

}