package io.masse.parityleaguestats;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.graphics.Typeface;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;

import java.util.ArrayList;

import io.masse.parityleaguestats.customLayout.customLinearLayout;
import io.masse.parityleaguestats.model.Team;
import io.masse.parityleaguestats.model.Teams;

public class SelectPlayers extends Activity {
    private customLinearLayout layoutLeft;
    private customLinearLayout layoutRight;
    private TextView leftTeamName, rightTeamName, leftScore, rightScore;
    private View.OnClickListener toggleUserListener;
    private Context context;

    private Teams teams;
    private Bookkeeper bookkeeper;

    private Team leftTeam;
    private Team rightTeam;
    ArrayList<String> leftPlayers;
    ArrayList<String> rightPlayers;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_select_players);
        context = this;

        loadIntent();
        renderGameBar();
        createListeners();
        renderPlayers();
        setupButtons();
    }

    private void loadIntent() {
        teams = (Teams)this.getIntent().getSerializableExtra("teams");
        bookkeeper = (Bookkeeper) this.getIntent().getSerializableExtra("bookkeeper");
        leftTeam = bookkeeper.homeTeam;
        rightTeam = bookkeeper.awayTeam;

        leftPlayers = new ArrayList<>();
        if (this.getIntent().hasExtra("leftPlayers")) {
            leftPlayers = (ArrayList<String>)this.getIntent().getSerializableExtra("leftPlayers");
        }
        rightPlayers = new ArrayList<>();
        if (this.getIntent().hasExtra("rightPlayers")) {
            rightPlayers = (ArrayList<String>)this.getIntent().getSerializableExtra("rightPlayers");
        }
    }

    private void renderGameBar() {
        leftTeamName = (TextView) findViewById(R.id.leftTeam);
        rightTeamName = (TextView) findViewById(R.id.rightTeam);

        leftTeamName.setText(bookkeeper.homeTeam.name);
        rightTeamName.setText(bookkeeper.awayTeam.name);

        leftScore = (TextView) findViewById(R.id.leftScore);
        rightScore = (TextView) findViewById(R.id.rightScore);

        leftScore.setText(bookkeeper.homeScore.toString());
        rightScore.setText(bookkeeper.awayScore.toString());
    }

    private void createListeners() {
        toggleUserListener = new View.OnClickListener(){
            @Override
            public void onClick(View view){
                Button currentButton = (Button) view;
                if (currentButton.getTypeface()!=null) {
                    currentButton.setTypeface(null, Typeface.NORMAL);
                } else {
                    currentButton.setTypeface(null, Typeface.BOLD);
                }
            }
        };
    }

    private void renderPlayers() {
        layoutLeft = (customLinearLayout) findViewById(R.id.layoutLeftNames);
        layoutRight = (customLinearLayout) findViewById(R.id.layoutRightNames);

        leftTeamName.setText(leftTeam.name);
        Utils.draw_players(context, layoutLeft, toggleUserListener, leftTeam, true);
        Utils.bold_players(layoutLeft, leftPlayers);

        rightTeamName.setText(rightTeam.name);
        Utils.draw_players(context, layoutRight, toggleUserListener, rightTeam, false);
        Utils.bold_players(layoutRight, rightPlayers);
    }

    private void setupButtons() {
        Button doneButton = (Button) findViewById(R.id.btnDone);
        doneButton.setOnClickListener(new View.OnClickListener() {
            public void onClick(View v) {
                playersSelected();
            }
        });

        Button btnUndo = (Button) findViewById(R.id.btnUndo);
        btnUndo.setOnClickListener(new View.OnClickListener() {
            public void onClick(View v) {
                int oldScore = bookkeeper.homeScore + bookkeeper.awayScore;
                bookkeeper.undo();
                int newScore = bookkeeper.homeScore + bookkeeper.awayScore;

                // put the right players back on
                if (newScore != oldScore) {
                    leftPlayers = new ArrayList(bookkeeper.homePlayers);
                    rightPlayers = new ArrayList(bookkeeper.awayPlayers);
                    renderPlayers();
                }

                playersSelected();
            }
        });
    }

    @Override
    public void onPause(){
        super.onPause();
    }

    @Override
    public void onBackPressed() {
        // Do nothing;
    }

    private void playersSelected() {
        int leftCount = layoutLeft.getChildCount();
        int rightCount = layoutRight.getChildCount();

        leftPlayers = new ArrayList<>();
        rightPlayers= new ArrayList<>();

        for (int i = 0; i < leftCount; i++) {
            Button currentButton = (Button) layoutLeft.getChildAt(i);
            if (currentButton.getTypeface() != null) {
                String playerName = currentButton.getText().toString();
                leftPlayers.add(playerName);
            }
        }
        for (int i = 0; i < rightCount; i++) {
            Button currentButton = (Button) layoutRight.getChildAt(i);
            if (currentButton.getTypeface() != null) {
                String playerName = currentButton.getText().toString();
                rightPlayers.add(playerName);
            }
        }

        int teamSize = 6;

        boolean leftCorrectNumPlayers = leftPlayers.size() == teamSize;
        boolean rightCorrectNumPlayers = rightPlayers.size() == teamSize;

        if (leftCorrectNumPlayers && rightCorrectNumPlayers) {
            bookkeeper.recordActivePlayers(leftPlayers, rightPlayers);

            Intent intent = new Intent(context, Stats.class);
            Bundle bundle = new Bundle();
            bundle.putSerializable("teams", teams);
            bundle.putSerializable("bookkeeper", bookkeeper);
            bundle.putSerializable("leftPlayers", leftPlayers);
            bundle.putSerializable("rightPlayers", rightPlayers);
            intent.putExtras(bundle);
            intent.setFlags(Intent.FLAG_ACTIVITY_NO_ANIMATION);
            startActivity(intent);

        } else {
            String error = "Incorrect number of players";
            if (!leftCorrectNumPlayers) {
                error += String.format("\nLeft side: %d/%d selected", leftPlayers.size(), teamSize);
            }

            if (!rightCorrectNumPlayers) {
                error += String.format("\nRight side: %d/%d selected", rightPlayers.size(), teamSize);
            }

            Toast.makeText(context, error, Toast.LENGTH_LONG).show();
            return;
        }
    }
}
