package io.masse.parityleaguestats;

import android.app.Activity;
import android.content.Intent;
import android.app.AlertDialog;
import android.content.Context;
import android.content.DialogInterface;
import android.os.Bundle;
import android.os.Environment;
import android.text.InputType;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.AutoCompleteTextView;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import java.io.File;

import io.masse.parityleaguestats.customLayout.customLinearLayout;
import io.masse.parityleaguestats.model.Gender;
import io.masse.parityleaguestats.model.Team;
import io.masse.parityleaguestats.model.Teams;
import io.masse.parityleaguestats.tasks.fetchRoster;

public class EditPlayers extends Activity {
    private static final File fileStorageDirectory = Environment.getExternalStorageDirectory();
    private static final String strAppDirectory = "ParityLeagueStats";
    private static final String strRosterFileName = "roster.JSON";

    TextView leftTeamName, rightTeamName;
    private customLinearLayout layoutLeft;
    private customLinearLayout layoutRight;
    private Button btnLastButtonClicked;
    private View.OnClickListener teamEditListener;
    private Context context;
    private final EditPlayers myself = this;

    private Teams teams;
    private Team leftTeam;
    private Team rightTeam;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_edit_players);

        context = this;

        teams = new Teams();

        leftTeamName = (TextView) findViewById(R.id.leftTeam);
        rightTeamName = (TextView) findViewById(R.id.rightTeam);

        layoutLeft = (customLinearLayout) findViewById(R.id.layoutLeftNames);
        layoutRight = (customLinearLayout) findViewById(R.id.layoutRightNames);

        teamEditListener = new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                btnLastButtonClicked = (Button) view;
                String deleteTxt = "Delete " + btnLastButtonClicked.getText();

                new AlertDialog.Builder(context)
                        .setTitle("Edit")
                        .setItems(new String[]{ deleteTxt, "Cancel" },
                            new DialogInterface.OnClickListener() {
                                public void onClick(DialogInterface dialog, int which) {
                                switch (which) {
                                    case 0: //delete player
                                        String playerName = btnLastButtonClicked.getText().toString();
                                        if (btnLastButtonClicked.getParent() == layoutLeft) {
                                            leftTeam.removePlayer(playerName);
                                        } else {
                                            rightTeam.removePlayer(playerName);
                                        }
                                        //TODO redraw
                                        break;
                                    case 1: //do nothing
                                        break;
                                }
                                }
                            }).show();
            }
        };

        final Button editButton = (Button) findViewById(R.id.btnAddPlayer);
        editButton.setOnClickListener(new View.OnClickListener() {
            public void onClick(View v) {
            final AutoCompleteTextView input = new AutoCompleteTextView(v.getContext());
            input.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PERSON_NAME | InputType.TYPE_TEXT_FLAG_CAP_WORDS);

            final String[] teams = new String[] {
                leftTeam.name,
                rightTeam.name
            };

            new AlertDialog.Builder(context)
                .setTitle("Choose Teams")
                .setItems(teams, new DialogInterface.OnClickListener() {
                    public void onClick(DialogInterface dialog, int which) {
                        switch (which) {
                            case 0:
                                addSubstitutePlayer(input, leftTeam);
                                break;
                            case 1:
                                addSubstitutePlayer(input, rightTeam);
                                break;
                        }
                    }
                }).show();
            }
        });


        final Button finishButton = (Button) findViewById(R.id.btnFinish);
        finishButton.setOnClickListener(new View.OnClickListener() {
                                            public void onClick(View v) {
                                                Intent intent = new Intent(context, Stats.class);
                                                Bundle bundle = new Bundle();
                                                //TODO make these serializable
                                                bundle.putSerializable("leftTeam", leftTeam);
                                                bundle.putSerializable("rightTeam", rightTeam);
                                                intent.putExtra("teams", bundle);
                                                startActivity(intent);
                                            }
                                        });

        // this probably shouldn't always run since this won't make sense if coming back to this state.
        new fetchRoster(this, myself).execute();
    }

    public void loadJSON() {
        String strFileName = fileStorageDirectory + "/" + strAppDirectory + "/" + strRosterFileName;

        try {
            teams.load(strFileName);
        }
        catch (Exception e) {
            Toast.makeText(this, e.toString(), Toast.LENGTH_LONG).show();
        }
    }

    public void loadNewTeams() {
        new AlertDialog.Builder(context)
            .setTitle("Choose Home Team")
            .setItems(teams.getNames(), new DialogInterface.OnClickListener() {
                public void onClick(DialogInterface dialog, int which) {
                leftTeam = teams.getTeam(which);
                leftTeamName.setText(leftTeam.name);
                Utils.draw_players(context, layoutLeft, teamEditListener, leftTeam, true);
                new AlertDialog.Builder(context)
                    .setTitle("Choose Away Team")
                    .setItems(teams.getNames(), new DialogInterface.OnClickListener() {
                        public void onClick(DialogInterface dialog, int which) {
                        rightTeam = teams.getTeam(which);
                        rightTeamName.setText(rightTeam.name);
                        Utils.draw_players(context, layoutRight, teamEditListener, rightTeam, false);
                        }
                    }).show();
                }
            }).show();
    }

    private void addSubstitutePlayer(final AutoCompleteTextView input, final Team team) {
        input.setAdapter(new ArrayAdapter<>(
            context,
            android.R.layout.simple_dropdown_item_1line,
            teams.allPlayers())
        );

        new AlertDialog.Builder(context)
            .setTitle("Add Substitute Player")
            .setMessage("Player Name")
            .setView(input)
            .setPositiveButton("Ok", new DialogInterface.OnClickListener() {
                public void onClick(DialogInterface dialog, int whichButton) {
                final String playerName = input.getText().toString() + "(S)";

                final Gender gender = teams.getPlayerGender(playerName);
                if (gender == Gender.Unknown) {
                    new AlertDialog.Builder(context)
                        .setTitle("Select Gender")
                        .setMessage(playerName)
                        .setPositiveButton("Female", new DialogInterface.OnClickListener() {
                            @Override
                            public void onClick(DialogInterface dialogInterface, int i) {
                                team.addPlayer(playerName, Gender.Female);
                                //TODO redraw
                            }
                        })
                        .setNegativeButton("Male", new DialogInterface.OnClickListener() {
                            @Override
                            public void onClick(DialogInterface dialogInterface, int i) {
                                team.addPlayer(playerName, Gender.Male);
                                //TODO redraw
                            }
                        }).show();
                } else {
                    team.addPlayer(playerName, gender);
                    //TODO redraw
                }

                }
            }).setNegativeButton("Cancel", new DialogInterface.OnClickListener() {
                public void onClick(DialogInterface dialog, int whichButton) {
                    // Do nothing.
                }
            }).show();
    }
}
