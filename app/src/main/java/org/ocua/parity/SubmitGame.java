package org.ocua.parity;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.DialogInterface;
import android.os.Bundle;
import android.widget.LinearLayout;
import android.widget.ProgressBar;

import io.masse.parityleaguestats.tasks.UploadGame;


public class SubmitGame extends Activity {
    public LinearLayout progress_area;
    public ProgressBar progress_bar;

    private Bookkeeper bookkeeper;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_submit_game);
        progress_area = (LinearLayout) findViewById(R.id.progressArea);
        progress_bar = (ProgressBar) findViewById(R.id.progressBar);

        loadIntent();
        openDialog("Submit this game?");
    }

    private void loadIntent() {
        bookkeeper = (Bookkeeper) this.getIntent().getSerializableExtra("bookkeeper");
    }

    public void openDialog(String message) {
        new AlertDialog.Builder(this)
                .setTitle("Submit Game")
                .setMessage(message)
                .setPositiveButton("Submit", new DialogInterface.OnClickListener() {
                    public void onClick(DialogInterface dialog, int whichButton) {
                        submit();
                    }
                }).setNegativeButton("Cancel", new DialogInterface.OnClickListener() {
            public void onClick(DialogInterface dialog, int whichButton) {
                finish();
            }
        }).show();
    }

    private void submit() {
        new UploadGame(bookkeeper, this).execute();
    }
}
