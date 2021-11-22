package org.ocua.parity;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.graphics.Typeface;
import android.os.Bundle;
import android.support.v4.app.ActivityCompat;
import android.view.Menu;
import android.view.MenuInflater;
import android.view.MenuItem;
import android.view.View;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;

import java.util.ArrayList;

import org.ocua.parity.customLayout.CustomLinearLayout;
import org.ocua.parity.model.League;
import org.ocua.parity.model.Team;
import org.ocua.parity.model.Teams;

public class SelectPlayers extends Activity {
    private CustomLinearLayout layoutLeft;
    private CustomLinearLayout layoutRight;
    private TextView leftTeamName, rightTeamName, leftScore, rightScore;
    private View.OnClickListener toggleUserListener;
    private Context context;

    private League league;
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
        Intent intent = this.getIntent();
        league = (League) intent.getSerializableExtra("league");
        teams = (Teams) intent.getSerializableExtra("teams");
        bookkeeper = (Bookkeeper) intent.getSerializableExtra("bookkeeper");
        leftTeam = bookkeeper.homeTeam;
        rightTeam = bookkeeper.awayTeam;

        if (this.getIntent().hasExtra("leftPlayers")) {
            leftPlayers = this.getIntent().getStringArrayListExtra("leftPlayers");
        }
        if (leftPlayers == null) {
            leftPlayers = new ArrayList<>();
        }

        if (this.getIntent().hasExtra("rightPlayers")) {
            rightPlayers = this.getIntent().getStringArrayListExtra("rightPlayers");
        }
        if (rightPlayers == null) {
            rightPlayers = new ArrayList<>();
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
        layoutLeft = (CustomLinearLayout) findViewById(R.id.layoutLeftNames);
        layoutRight = (CustomLinearLayout) findViewById(R.id.layoutRightNames);

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

    public boolean onCreateOptionsMenu(Menu menu) {
        MenuInflater inflater = getMenuInflater();
        inflater.inflate(R.menu.menu_stats, menu);
        return true;
    }

    public boolean onOptionsItemSelected(MenuItem item) {
        switch (item.getItemId()) {
            case R.id.action_edit_players:
                editRosters();
                return true;
            case R.id.action_record_half:
                bookkeeper.recordHalf();
                Toast.makeText(context, "Half Recorded", Toast.LENGTH_LONG).show();
                return true;
            case R.id.action_save_game:
                submitGame();
                return true;
            default:
                return super.onOptionsItemSelected(item);
        }
    }

    private void editRosters() {
        Intent intent = new Intent(this, EditRosters.class);
        Bundle bundle = new Bundle();
        bundle.putSerializable("teams", teams);
        bundle.putSerializable("bookkeeper", bookkeeper);
        bundle.putStringArrayList("leftPlayers", leftPlayers);
        bundle.putStringArrayList("rightPlayers", rightPlayers);
        intent.putExtras(bundle);
        intent.setFlags(Intent.FLAG_ACTIVITY_NO_ANIMATION);
        startActivity(intent);
    }

    private void submitGame() {
        Intent intent = new Intent(this, SubmitGame.class);
        Bundle bundle = new Bundle();
        bundle.putSerializable("bookkeeper", bookkeeper);
        intent.putExtras(bundle);
        startActivity(intent);
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

        int leftPlayerCount = leftPlayers.size();
        int rightPlayerCount = rightPlayers.size();

        boolean leftCorrectNumPlayers = leftPlayerCount == league.teamSize;
        boolean rightCorrectNumPlayers = rightPlayerCount == league.teamSize;

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
            String message = "Incorrect number of players:";

            if (!leftCorrectNumPlayers) {
                message += String.format("\nLeft side: %d/%d selected", leftPlayerCount, league.teamSize);
            }

            if (!rightCorrectNumPlayers) {
                message += String.format("\nRight side: %d/%d selected", rightPlayerCount, league.teamSize);
            }

            message += "\n\nContinue with these players anyway?";

            new AlertDialog.Builder(context)
                    .setTitle("Confirm Player Count")
                    .setMessage(message)
                    .setPositiveButton("Ok", new DialogInterface.OnClickListener() {
                        @Override
                        public void onClick(DialogInterface dialog, int which) {
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
                        }
                    })
                    .setNegativeButton("Cancel", new DialogInterface.OnClickListener() {
                        @Override
                        public void onClick(DialogInterface dialog, int which) {
                            dialog.dismiss();
                        }
                    })
                    .show();
        }
    }
}
