package io.masse.parityleaguestats;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.os.AsyncTask;
import android.os.Bundle;
import android.view.Menu;
import android.view.MenuInflater;
import android.view.MenuItem;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.ListView;
import android.widget.TextView;

import java.util.ArrayList;

import io.masse.parityleaguestats.customLayout.customLinearLayout;
import io.masse.parityleaguestats.model.Team;
import io.masse.parityleaguestats.model.Teams;
import io.masse.parityleaguestats.tasks.uploadGame;

public class Stats extends Activity {
    //States for each ViewState to be in.
    private static final int autoState = 0;
    private static final int normalState = 1;
    private static final int firstDState = 2;
    private static final int startState = 3;
    private static final int pullState = 4;
    private static final int whoPickedUpDiscState = 5;
    private static final int firstThrowQuebecVariantState = 6;
    private static final int halfState = 7;

    private customLinearLayout layoutLeft;
    private customLinearLayout layoutRight;
    private Context context;

    private Button btnPull, btnPoint, btnDrop, btnD, btnCatchD,  btnThrowAway, btnUndo, btnMode;
    private TextView leftTeamName, rightTeamName, leftScore, rightScore;

    private Bookkeeper bookkeeper;

    private View.OnClickListener mainOnClickListener;
    private View.OnClickListener changeModeListener;

    private final Stats myself = this;

    private Teams teams;
    private Team leftTeam;
    private Team rightTeam;
    ArrayList<String> leftPlayers;
    ArrayList<String> rightPlayers;

    private ArrayAdapter<String> gameSummaryAdapter;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_stats);
        context = this;

        teams = (Teams)this.getIntent().getSerializableExtra("teams");
        leftTeam = (Team)this.getIntent().getSerializableExtra("leftTeam");
        rightTeam = (Team)this.getIntent().getSerializableExtra("rightTeam");
        leftPlayers = (ArrayList<String>)this.getIntent().getSerializableExtra("leftPlayers");
        rightPlayers = (ArrayList<String>)this.getIntent().getSerializableExtra("rightPlayers");

        // Setup Buttons
        btnPull = (Button) findViewById(R.id.btnPull);
        btnPoint = (Button) findViewById(R.id.btnPoint);
        btnDrop = (Button) findViewById(R.id.btnDrop);
        btnD = (Button) findViewById(R.id.btnD);
        btnCatchD = (Button) findViewById(R.id.btnCatchD);
        btnThrowAway = (Button) findViewById(R.id.btnThrowAway);
        btnUndo = (Button) findViewById(R.id.btnUndo);
        btnMode = (Button) findViewById(R.id.btnMode);

        // Setup TextView
        leftTeamName = (TextView) findViewById(R.id.leftTeam);
        rightTeamName = (TextView) findViewById(R.id.rightTeam);
        leftScore = (TextView) findViewById(R.id.leftScore);
        rightScore = (TextView) findViewById(R.id.rightScore);

        layoutLeft = (customLinearLayout) findViewById(R.id.layoutLeftNames);
        layoutRight = (customLinearLayout) findViewById(R.id.layoutRightNames);

        // undo view
        ListView listView = (ListView) findViewById(R.id.listPlayByPlay);
        gameSummaryAdapter = new ArrayAdapter<>(this, R.layout.game_summary_event_view, R.id.title_text);
        listView.setAdapter(gameSummaryAdapter);

        bookkeeper = new Bookkeeper();
        bookkeeper.startGame(leftTeam, rightTeam);

        mainOnClickListener = new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                new ButtonPress().execute((Button) view);
            }
        };

        changeModeListener = new View.OnClickListener(){
            @Override
            public void onClick(View view) {
                pickRoster();
            }
        };

        leftTeamName.setText(leftTeam.name);
        Utils.draw_players(context, layoutLeft, mainOnClickListener, leftTeam, true);
        Utils.show_players(context, layoutLeft, leftPlayers);

        rightTeamName.setText(rightTeam.name);
        Utils.draw_players(context, layoutRight, mainOnClickListener, rightTeam, false);
        Utils.show_players(context, layoutRight, rightPlayers);

        btnUndo.setOnClickListener(mainOnClickListener);
        btnPoint.setOnClickListener(mainOnClickListener);
        btnDrop.setOnClickListener(mainOnClickListener);
        btnPull.setOnClickListener(mainOnClickListener);
        btnD.setOnClickListener(mainOnClickListener);
        btnCatchD.setOnClickListener(mainOnClickListener);
        btnThrowAway.setOnClickListener(mainOnClickListener);
        btnMode.setOnClickListener(changeModeListener);

        // set UI state
        updateUI(bookkeeper.gameState());
    }

    @Override
    public void onPause(){
        super.onPause();
    }

    @Override
    public void onBackPressed() {
        // Do nothing;
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        MenuInflater inflater = getMenuInflater();
        inflater.inflate(R.menu.main_activity_actions, menu);
        return super.onCreateOptionsMenu(menu);
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        switch (item.getItemId()) {
            case R.id.action_edit_players:
                editPlayers();
                return true;
            case R.id.action_save_game:
                new AlertDialog.Builder(context)
                        .setTitle("Save and Clear")
                        .setMessage("Are you sure sure?" )
                        .setPositiveButton("Yes", new DialogInterface.OnClickListener() {
                            public void onClick(DialogInterface dialog, int whichButton) {
                                bookkeeper.gameCompleted();
                                uploadGame();
                                resetApp();
                            }
                        }).setNeutralButton("Clear", new DialogInterface.OnClickListener() {
                            public void onClick(DialogInterface dialog, int whichButton) {
                                bookkeeper.gameCompleted();
                                bookkeeper.backup(); // this is in case someone fat fingers a clear
                                resetApp();
                            }
                        }).setNegativeButton("Cancel", new DialogInterface.OnClickListener() {
                            public void onClick(DialogInterface dialog, int whichButton) {
                                bookkeeper.backup(); // this is in case someone fat fingers a cancel
                            }
                        }).show();
                return true;
            case R.id.action_half:
                bookkeeper.recordHalf();
                return true;
            default:
                return super.onOptionsItemSelected(item);
        }
    }

    private void editPlayers() {
        Intent intent = new Intent(myself, EditPlayers.class);
        Bundle bundle = new Bundle();
        bundle.putSerializable("teams", teams);
        bundle.putSerializable("leftTeam", leftTeam);
        bundle.putSerializable("rightTeam", rightTeam);
        intent.putExtras(bundle);
        intent.setFlags(Intent.FLAG_ACTIVITY_NO_ANIMATION);
        startActivity(intent);
    }

    private void pickRoster() {
        Intent intent = new Intent(context, Roster.class);
        Bundle bundle = new Bundle();
        bundle.putSerializable("teams", teams);
        bundle.putSerializable("leftTeam", leftTeam);
        bundle.putSerializable("rightTeam", rightTeam);
        bundle.putSerializable("leftPlayers", leftPlayers);
        bundle.putSerializable("rightPlayers", rightPlayers);
        intent.putExtras(bundle);
        intent.setFlags(Intent.FLAG_ACTIVITY_NO_ANIMATION);
        startActivity(intent);
    }

    private void resetApp() {
        Intent intent = new Intent(myself, ChooseTeams.class);
        startActivity(intent);
    }

    private void uploadGame() {
        try {
            String json = bookkeeper.serialize().toString();
            new uploadGame(context).execute(json);

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private class ButtonPress extends AsyncTask <Button, Button, Long> {

        @SuppressWarnings("ResourceType")
        @Override
        protected Long doInBackground(Button... btns) {

            if (btns.length == 1) {
                Button btn = btns[0];
                String buttonText = btn.getText().toString();
                Boolean leftSideButton = btn.getParent() == layoutLeft;
                Boolean rightSideButton = btn.getParent() == layoutRight;

                if (leftSideButton) {
                    if (bookkeeper.shouldRecordNewPass()) {
                        bookkeeper.recordPass(buttonText);
                    } else {
                        bookkeeper.recordFirstActor(buttonText, true);
                    }

                } else if (rightSideButton) {
                    if (bookkeeper.shouldRecordNewPass()) {
                        bookkeeper.recordPass(buttonText);
                    } else {
                        bookkeeper.recordFirstActor(buttonText, false);
                    }

                } else if ((btn == btnD)) {
                    bookkeeper.recordD();

                } else if ((btn == btnCatchD)){
                    bookkeeper.recordCatchD();

                } else if ((btn == btnDrop)){
                    bookkeeper.recordDrop();

                } else if ((btn == btnPull)){
                    bookkeeper.recordPull();

                } else if ((btn == btnThrowAway)){
                    bookkeeper.recordThrowAway();

                } else if (btn == btnPoint) {
                    bookkeeper.recordPoint();
                    pickRoster();

                } else if (btn == btnUndo) {
                    bookkeeper.undo();
                }

                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        updateUI(bookkeeper.gameState());
                        gameSummaryAdapter.clear();
                        gameSummaryAdapter.addAll(bookkeeper.undoHistory());
                        gameSummaryAdapter.notifyDataSetChanged();
                    }
                });
            }
            return null;
        }
    }

    private void updateUI(int change) {
        int leftCount = layoutLeft.getChildCount();
        int rightCount = layoutRight.getChildCount();

        switch (change) {
            case normalState:
                btnPoint.setEnabled(true);
                btnDrop.setEnabled(true);
                btnD.setEnabled(false);
                btnCatchD.setEnabled(false);
                btnThrowAway.setEnabled(true);
                btnUndo.setEnabled(true);
                btnPull.setEnabled(false);
                btnMode.setEnabled(true);
                for (int i = 0; i < leftCount; i++){
                    layoutLeft.getChildAt(i).setEnabled(bookkeeper.homePossession);
                    if (((Button) layoutLeft.getChildAt(i)).getText().toString() == bookkeeper.firstActor) {
                        layoutLeft.getChildAt(i).setEnabled(false);
                    }
                }
                for (int i = 0; i < rightCount; i++){
                    layoutRight.getChildAt(i).setEnabled(!bookkeeper.homePossession);
                    if (((Button) layoutRight.getChildAt(i)).getText().toString() == bookkeeper.firstActor) {
                        layoutRight.getChildAt(i).setEnabled(false);
                    }
                }
                break;

            case firstThrowQuebecVariantState:
                btnPoint.setEnabled(false);
                btnDrop.setEnabled(false);
                btnD.setEnabled(false);
                btnCatchD.setEnabled(false);
                btnThrowAway.setEnabled(true);
                btnUndo.setEnabled(true);
                btnPull.setEnabled(false);
                btnMode.setEnabled(true);
                for (int i = 0; i < leftCount; i++){
                    layoutLeft.getChildAt(i).setEnabled(bookkeeper.homePossession);
                    if (((Button) layoutLeft.getChildAt(i)).getText().toString() == bookkeeper.firstActor) {
                        layoutLeft.getChildAt(i).setEnabled(false);
                    }
                }
                for (int i = 0; i < rightCount; i++){
                    layoutRight.getChildAt(i).setEnabled(!bookkeeper.homePossession);
                    if (((Button) layoutRight.getChildAt(i)).getText().toString() == bookkeeper.firstActor) {
                        layoutRight.getChildAt(i).setEnabled(false);
                    }
                }
                break;

            case firstDState:
                btnPoint.setEnabled(true);
                btnDrop.setEnabled(false);
                btnD.setEnabled(true);
                btnCatchD.setEnabled(true);
                btnThrowAway.setEnabled(true);
                btnUndo.setEnabled(true);
                btnPull.setEnabled(false);
                btnMode.setEnabled(true);
                for (int i = 0; i < leftCount; i++){
                    layoutLeft.getChildAt(i).setEnabled(bookkeeper.homePossession);
                    if (((Button) layoutLeft.getChildAt(i)).getText().toString() == bookkeeper.firstActor) {
                        layoutLeft.getChildAt(i).setEnabled(false);
                    }
                }
                for (int i = 0; i < rightCount; i++){
                    layoutRight.getChildAt(i).setEnabled(!bookkeeper.homePossession);
                    if (((Button) layoutRight.getChildAt(i)).getText().toString() == bookkeeper.firstActor) {
                        layoutRight.getChildAt(i).setEnabled(false);
                    }
                }
                break;

            case startState:
                btnPoint.setEnabled(false);
                btnDrop.setEnabled(false);
                btnD.setEnabled(false);
                btnCatchD.setEnabled(false);
                btnThrowAway.setEnabled(false);
                btnPull.setEnabled(false);
                btnUndo.setEnabled(true);
                btnMode.setEnabled(true);
                for (int i = 0; i < leftCount; i++){
                    layoutLeft.getChildAt(i).setEnabled(true);
                }
                for (int i = 0; i < rightCount; i++){
                    layoutRight.getChildAt(i).setEnabled(true);
                }
                break;

            case pullState:
                btnPoint.setEnabled(false);
                btnDrop.setEnabled(false);
                btnD.setEnabled(false);
                btnThrowAway.setEnabled(false);
                btnUndo.setEnabled(true);
                btnPull.setEnabled(true);
                btnMode.setEnabled(true);
                for (int i = 0; i < leftCount; i++){
                    layoutLeft.getChildAt(i).setEnabled(false);
                }
                for (int i = 0; i < rightCount; i++){
                    layoutRight.getChildAt(i).setEnabled(false);
                }
                break;

            case whoPickedUpDiscState:
                btnPoint.setEnabled(false);
                btnDrop.setEnabled(false);
                btnD.setEnabled(false);
                btnCatchD.setEnabled(false);
                btnThrowAway.setEnabled(false);
                btnUndo.setEnabled(true);
                btnPull.setEnabled(false);
                btnMode.setEnabled(true);
                for (int i = 0; i < leftCount; i++){
                    layoutLeft.getChildAt(i).setEnabled(bookkeeper.homePossession);
                    if (((Button) layoutLeft.getChildAt(i)).getText().toString() == bookkeeper.firstActor) {
                        layoutLeft.getChildAt(i).setEnabled(false);
                    }
                }
                for (int i = 0; i < rightCount; i++){
                    layoutRight.getChildAt(i).setEnabled(!bookkeeper.homePossession);
                    if (((Button) layoutRight.getChildAt(i)).getText().toString() == bookkeeper.firstActor) {
                        layoutRight.getChildAt(i).setEnabled(false);
                    }
                }
                break;

            case halfState:
                btnPoint.setEnabled(false);
                btnDrop.setEnabled(false);
                btnD.setEnabled(false);
                btnCatchD.setEnabled(false);
                btnThrowAway.setEnabled(false);
                btnUndo.setEnabled(true);
                btnPull.setEnabled(false);
                btnMode.setEnabled(true);
                for (int i = 0; i < leftCount; i++){
                    layoutLeft.getChildAt(i).setEnabled(true);
                }
                for (int i = 0; i < rightCount; i++){
                    layoutRight.getChildAt(i).setEnabled(true);
                }
                break;
        }
    }
}
